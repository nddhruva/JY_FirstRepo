"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-03-19 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("region", sa.String(length=128), nullable=False),
        sa.Column("isolation_tier", sa.String(length=32), nullable=False),
        sa.Column("default_locale", sa.String(length=32), nullable=False),
        sa.Column("supported_locales", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=128), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=True),
        sa.Column("roles", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("business_criticality", sa.String(length=64), nullable=False),
        sa.Column("data_classification", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("target_vendors", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_applications_tenant_id"), "applications", ["tenant_id"], unique=False)

    op.create_table(
        "application_instances",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("instance_name", sa.String(length=128), nullable=False),
        sa.Column("environment_type", sa.String(length=32), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=True),
        sa.Column("region", sa.String(length=128), nullable=True),
        sa.Column("connector_profile_id", sa.Uuid(), nullable=True),
        sa.Column("secret_reference", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_application_instances_application_id"),
        "application_instances",
        ["application_id"],
        unique=False,
    )

    op.create_table(
        "questionnaire_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("sections", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "workflow_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("nodes", sa.JSON(), nullable=False),
        sa.Column("transitions", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "provider_access_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by", sa.Uuid(), nullable=True),
        sa.Column("purpose", sa.String(length=255), nullable=False),
        sa.Column("allowed_data_scope", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "auth_provider_configs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("provider_name", sa.String(length=255), nullable=False),
        sa.Column("protocol", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("claim_mapping", sa.JSON(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False),
        sa.Column("is_fallback", sa.Boolean(), nullable=False),
        sa.Column("login_policy", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_auth_provider_configs_tenant_id"),
        "auth_provider_configs",
        ["tenant_id"],
        unique=False,
    )

    op.create_table(
        "sync_connector_configs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("source_category", sa.String(length=64), nullable=False),
        sa.Column("provider_name", sa.String(length=255), nullable=False),
        sa.Column("sync_mode", sa.String(length=64), nullable=False),
        sa.Column("include_objects", sa.JSON(), nullable=False),
        sa.Column("filter_policy", sa.JSON(), nullable=False),
        sa.Column("credential_reference", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_sync_connector_configs_tenant_id"),
        "sync_connector_configs",
        ["tenant_id"],
        unique=False,
    )

    op.create_table(
        "sync_jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("connector_id", sa.Uuid(), nullable=False),
        sa.Column("run_type", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("stats", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["connector_id"], ["sync_connector_configs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "executions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("request_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "compliance_reports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("framework", sa.String(length=64), nullable=False),
        sa.Column("scope_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "accessibility_preferences",
        sa.Column("user_key", sa.String(length=255), nullable=False),
        sa.Column("keyboard_only_mode", sa.Boolean(), nullable=False),
        sa.Column("focus_ring_style", sa.String(length=64), nullable=False),
        sa.Column("reduced_motion", sa.Boolean(), nullable=False),
        sa.Column("high_contrast_mode", sa.Boolean(), nullable=False),
        sa.Column("screen_reader_optimized", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("user_key"),
    )

    op.create_table(
        "ingests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "exports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("exports")
    op.drop_table("ingests")
    op.drop_table("accessibility_preferences")
    op.drop_table("compliance_reports")
    op.drop_table("executions")
    op.drop_table("sync_jobs")
    op.drop_index(op.f("ix_sync_connector_configs_tenant_id"), table_name="sync_connector_configs")
    op.drop_table("sync_connector_configs")
    op.drop_index(op.f("ix_auth_provider_configs_tenant_id"), table_name="auth_provider_configs")
    op.drop_table("auth_provider_configs")
    op.drop_table("provider_access_requests")
    op.drop_table("workflow_templates")
    op.drop_table("questionnaire_templates")
    op.drop_index(op.f("ix_application_instances_application_id"), table_name="application_instances")
    op.drop_table("application_instances")
    op.drop_index(op.f("ix_applications_tenant_id"), table_name="applications")
    op.drop_table("applications")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
    op.drop_table("tenants")
