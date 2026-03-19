from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class TenantRecord(Base):
    __tablename__ = "tenants"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    region: Mapped[str] = mapped_column(String(128), nullable=False)
    isolation_tier: Mapped[str] = mapped_column(String(32), nullable=False)
    default_locale: Mapped[str] = mapped_column(String(32), nullable=False, default="en-US")
    supported_locales: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    applications: Mapped[list["ApplicationRecord"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    users: Mapped[list["UserRecord"]] = relationship(back_populates="tenant")


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    tenant_id: Mapped[UUID | None] = mapped_column(ForeignKey("tenants.id"), nullable=True)
    roles: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    tenant: Mapped["TenantRecord | None"] = relationship(back_populates="users")


class ApplicationRecord(Base):
    __tablename__ = "applications"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_criticality: Mapped[str] = mapped_column(String(64), nullable=False)
    data_classification: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="draft", nullable=False)
    target_vendors: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    tenant: Mapped["TenantRecord"] = relationship(back_populates="applications")
    instances: Mapped[list["ApplicationInstanceRecord"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class ApplicationInstanceRecord(Base):
    __tablename__ = "application_instances"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    instance_name: Mapped[str] = mapped_column(String(128), nullable=False)
    environment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    endpoint: Mapped[str | None] = mapped_column(Text, nullable=True)
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    connector_profile_id: Mapped[UUID | None] = mapped_column(nullable=True)
    secret_reference: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    application: Mapped["ApplicationRecord"] = relationship(back_populates="instances")


class QuestionnaireTemplateRecord(Base):
    __tablename__ = "questionnaire_templates"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sections: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)


class WorkflowTemplateRecord(Base):
    __tablename__ = "workflow_templates"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    nodes: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    transitions: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)


class ProviderAccessRequestRecord(Base):
    __tablename__ = "provider_access_requests"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    requested_by: Mapped[UUID | None] = mapped_column(nullable=True)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    allowed_data_scope: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)


class AuthProviderConfigRecord(Base):
    __tablename__ = "auth_provider_configs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), index=True, nullable=False)
    provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
    protocol: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    claim_mapping: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_fallback: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    login_policy: Mapped[str] = mapped_column(String(64), default="always", nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="active", nullable=False)


class SyncConnectorConfigRecord(Base):
    __tablename__ = "sync_connector_configs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), index=True, nullable=False)
    source_category: Mapped[str] = mapped_column(String(64), nullable=False)
    provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sync_mode: Mapped[str] = mapped_column(String(64), nullable=False)
    include_objects: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    filter_policy: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    credential_reference: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="active", nullable=False)


class SyncJobRecord(Base):
    __tablename__ = "sync_jobs"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    connector_id: Mapped[UUID] = mapped_column(ForeignKey("sync_connector_configs.id"), nullable=False)
    run_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    stats: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ExecutionRecord(Base):
    __tablename__ = "executions"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("applications.id"), nullable=False)
    request_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ComplianceReportRecord(Base):
    __tablename__ = "compliance_reports"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    framework: Mapped[str] = mapped_column(String(64), nullable=False)
    scope_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class AccessibilityPreferenceRecord(Base):
    __tablename__ = "accessibility_preferences"

    user_key: Mapped[str] = mapped_column(String(255), primary_key=True)
    keyboard_only_mode: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    focus_ring_style: Mapped[str] = mapped_column(String(64), default="default", nullable=False)
    reduced_motion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    high_contrast_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    screen_reader_optimized: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class IngestRecord(Base):
    __tablename__ = "ingests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[UUID] = mapped_column(ForeignKey("applications.id"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


class ExportRecord(Base):
    __tablename__ = "exports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
