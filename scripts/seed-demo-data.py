#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid5

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from aop_api.db import SessionLocal, init_db
from aop_api.db_models import (  # noqa: E402
    AccessibilityPreferenceRecord,
    ApplicationInstanceRecord,
    ApplicationRecord,
    AuthProviderConfigRecord,
    BrandingConfigRecord,
    ComplianceReportRecord,
    DashboardConfigRecord,
    ExecutionRecord,
    ProviderAccessRequestRecord,
    QuestionnaireTemplateRecord,
    ReportRecord,
    SyncConnectorConfigRecord,
    SyncJobRecord,
    TenantRecord,
    UserRecord,
    WorkflowTemplateRecord,
)
from aop_api.main import seed_bootstrap_admin  # noqa: E402
from aop_api.security import hash_password  # noqa: E402


DEMO_NAMESPACE = UUID("5adf72fc-6db4-4f0f-88da-e53b91b9f82e")
DEMO_TENANT_NAME = os.getenv("AOP_DEMO_TENANT_NAME", "Northstar Financial Group")
DEMO_PASSWORD = os.getenv("AOP_DEMO_PASSWORD", "DemoPass123!")


def demo_uuid(key: str) -> UUID:
    return uuid5(DEMO_NAMESPACE, key)


def upsert_record(db, model, record_id: UUID, **fields):
    record = db.query(model).filter(model.id == record_id).one_or_none()
    if record is None:
        record = model(id=record_id, **fields)
        db.add(record)
        return record
    for key, value in fields.items():
        setattr(record, key, value)
    return record


def upsert_user(
    db,
    *,
    username: str,
    role: str,
    tenant_id: UUID,
    password: str,
) -> UserRecord:
    user = db.query(UserRecord).filter(UserRecord.username == username).one_or_none()
    if user is None:
        user = UserRecord(
            id=demo_uuid(f"user:{username}"),
            username=username,
            password_hash=hash_password(password),
            tenant_id=tenant_id,
            roles=[role],
            is_active=True,
        )
        db.add(user)
        return user
    user.password_hash = hash_password(password)
    user.tenant_id = tenant_id
    user.roles = [role]
    user.is_active = True
    return user


def seed_demo_data() -> dict:
    init_db()
    with SessionLocal() as db:
        seed_bootstrap_admin(db)
        now = datetime.now(timezone.utc)

        tenant_id = demo_uuid("tenant:northstar")
        tenant = db.query(TenantRecord).filter(TenantRecord.id == tenant_id).one_or_none()
        if tenant is None:
            tenant = TenantRecord(
                id=tenant_id,
                name=DEMO_TENANT_NAME,
                region="us-east-1",
                isolation_tier="dedicated",
                default_locale="en-US",
                supported_locales=["en-US", "fr-FR", "de-DE"],
            )
            db.add(tenant)
        else:
            tenant.name = DEMO_TENANT_NAME
            tenant.region = "us-east-1"
            tenant.isolation_tier = "dedicated"
            tenant.default_locale = "en-US"
            tenant.supported_locales = ["en-US", "fr-FR", "de-DE"]

        demo_users = [
            ("tenant_admin_northstar", "tenant_admin"),
            ("app_owner_payments", "app_owner"),
            ("integration_admin_northstar", "integration_admin"),
            ("compliance_admin_northstar", "compliance_admin"),
            ("auditor_northstar", "auditor"),
        ]
        user_records: dict[str, UserRecord] = {}
        for username, role in demo_users:
            user_records[username] = upsert_user(
                db,
                username=username,
                role=role,
                tenant_id=tenant_id,
                password=DEMO_PASSWORD,
            )

        apps = [
            {
                "slug": "payroll-hub",
                "name": "Payroll Hub",
                "criticality": "high",
                "classification": "restricted",
                "status": "completed",
                "target_vendors": [{"domain": "IGA", "vendor": "SailPoint", "product": "IdentityIQ"}],
                "instances": [
                    ("payroll-dev", "dev", "https://dev-payroll.northstar.demo"),
                    ("payroll-test", "test", "https://test-payroll.northstar.demo"),
                    ("payroll-prod", "prod", "https://payroll.northstar.demo"),
                ],
            },
            {
                "slug": "customer360-crm",
                "name": "Customer360 CRM",
                "criticality": "high",
                "classification": "confidential",
                "status": "onboarded",
                "target_vendors": [{"domain": "IAM", "vendor": "Microsoft", "product": "Entra ID"}],
                "instances": [
                    ("crm-prod", "prod", "https://crm.northstar.demo"),
                ],
            },
            {
                "slug": "privileged-vault-ops",
                "name": "Privileged Vault Ops",
                "criticality": "critical",
                "classification": "restricted",
                "status": "draft",
                "target_vendors": [{"domain": "PAM", "vendor": "CyberArk", "product": "PAM"}],
                "instances": [
                    ("vault-stage", "stage", "https://stage-vault.northstar.demo"),
                    ("vault-prod", "prod", "https://vault.northstar.demo"),
                ],
            },
            {
                "slug": "access-review-studio",
                "name": "Access Review Studio",
                "criticality": "medium",
                "classification": "confidential",
                "status": "failed",
                "target_vendors": [{"domain": "IGA", "vendor": "SailPoint", "product": "IdentityIQ"}],
                "instances": [
                    ("review-dev", "dev", "https://review-dev.northstar.demo"),
                    ("review-prod", "prod", "https://review.northstar.demo"),
                ],
            },
            {
                "slug": "workforce-sso-portal",
                "name": "Workforce SSO Portal",
                "criticality": "high",
                "classification": "internal",
                "status": "in_progress",
                "target_vendors": [{"domain": "SSO", "vendor": "Okta", "product": "Workforce Identity Cloud"}],
                "instances": [
                    ("sso-uat", "uat", "https://uat-sso.northstar.demo"),
                    ("sso-prod", "prod", "https://sso.northstar.demo"),
                ],
            },
        ]

        app_ids: dict[str, UUID] = {}
        for app in apps:
            app_id = demo_uuid(f"app:{app['slug']}")
            app_ids[app["slug"]] = app_id
            upsert_record(
                db,
                ApplicationRecord,
                app_id,
                tenant_id=tenant_id,
                name=app["name"],
                business_criticality=app["criticality"],
                data_classification=app["classification"],
                status=app["status"],
                target_vendors=app["target_vendors"],
            )
            for instance_name, environment, endpoint in app["instances"]:
                instance_id = demo_uuid(f"instance:{app['slug']}:{instance_name}")
                upsert_record(
                    db,
                    ApplicationInstanceRecord,
                    instance_id,
                    application_id=app_id,
                    instance_name=instance_name,
                    environment_type=environment,
                    endpoint=endpoint,
                    region="us-east-1",
                    connector_profile_id=None,
                    secret_reference={"provider": "vault", "path": f"secret/northstar/{app['slug']}/{environment}"},
                    status="ready" if app["status"] in {"completed", "onboarded"} else "draft",
                )

        upsert_record(
            db,
            QuestionnaireTemplateRecord,
            demo_uuid("questionnaire:base"),
            version=3,
            name="AOP Baseline Onboarding Questionnaire",
            sections=[
                {"title": "Business Context", "questions": ["What does the application do?", "Who owns it?"]},
                {"title": "Security", "questions": ["What auth mechanisms are supported?", "What is data classification?"]},
            ],
        )
        upsert_record(
            db,
            WorkflowTemplateRecord,
            demo_uuid("workflow:standard"),
            version=2,
            name="Standard Onboarding Approval",
            nodes=[
                {"id": "start", "type": "start"},
                {"id": "app_owner_approval", "type": "approval"},
                {"id": "security_review", "type": "review"},
                {"id": "complete", "type": "end"},
            ],
            transitions=[
                {"from": "start", "to": "app_owner_approval"},
                {"from": "app_owner_approval", "to": "security_review"},
                {"from": "security_review", "to": "complete"},
            ],
        )

        upsert_record(
            db,
            AuthProviderConfigRecord,
            demo_uuid("auth-config:entra-primary"),
            tenant_id=tenant_id,
            provider_name="Microsoft Entra ID",
            protocol="OIDC",
            metadata_json={"issuer": "https://login.microsoftonline.com/demo", "tenant": "northstar"},
            claim_mapping={"email": "mail", "username": "userPrincipalName"},
            is_primary=True,
            is_fallback=False,
            login_policy="always",
            status="active",
        )
        upsert_record(
            db,
            AuthProviderConfigRecord,
            demo_uuid("auth-config:okta-fallback"),
            tenant_id=tenant_id,
            provider_name="Okta Workforce Identity Cloud",
            protocol="SAML",
            metadata_json={"ssoUrl": "https://northstar.okta.com/app/demo/sso/saml"},
            claim_mapping={"email": "email", "username": "login"},
            is_primary=False,
            is_fallback=True,
            login_policy="fallback_only",
            status="active",
        )

        sync_workday_id = demo_uuid("sync-config:workday")
        sync_entra_id = demo_uuid("sync-config:entra")
        upsert_record(
            db,
            SyncConnectorConfigRecord,
            sync_workday_id,
            tenant_id=tenant_id,
            source_category="hr",
            provider_name="Workday",
            sync_mode="scheduled",
            include_objects=["users", "employment", "ownership"],
            filter_policy={"includeInactive": False, "region": "NA"},
            credential_reference={"provider": "vault", "path": "secret/northstar/workday"},
            status="active",
        )
        upsert_record(
            db,
            SyncConnectorConfigRecord,
            sync_entra_id,
            tenant_id=tenant_id,
            source_category="iam",
            provider_name="Microsoft Entra ID",
            sync_mode="delta",
            include_objects=["users", "groups", "applications"],
            filter_policy={"includeGuests": False},
            credential_reference={"provider": "vault", "path": "secret/northstar/entra"},
            status="active",
        )
        upsert_record(
            db,
            SyncJobRecord,
            demo_uuid("sync-job:workday-last"),
            connector_id=sync_workday_id,
            run_type="scheduled",
            status="completed",
            stats={"usersProcessed": 214, "applicationsProcessed": 18, "errors": 0},
        )
        upsert_record(
            db,
            SyncJobRecord,
            demo_uuid("sync-job:entra-last"),
            connector_id=sync_entra_id,
            run_type="delta",
            status="failed",
            stats={"usersProcessed": 87, "applicationsProcessed": 3, "errors": 2},
        )

        upsert_record(
            db,
            ExecutionRecord,
            demo_uuid("execution:customer360"),
            application_id=app_ids["customer360-crm"],
            request_json={"mode": "ootb", "vendor": "Microsoft", "product": "Entra ID"},
            status="completed",
        )
        upsert_record(
            db,
            ExecutionRecord,
            demo_uuid("execution:access-review"),
            application_id=app_ids["access-review-studio"],
            request_json={"mode": "custom", "vendor": "SailPoint", "product": "IdentityIQ"},
            status="failed",
        )

        upsert_record(
            db,
            ProviderAccessRequestRecord,
            demo_uuid("provider-access:pending"),
            tenant_id=tenant_id,
            requested_by=user_records["tenant_admin_northstar"].id,
            purpose="Joint troubleshooting for failed onboarding runs",
            allowed_data_scope=["application_metadata", "execution_status"],
            expires_at=now + timedelta(days=14),
            status="pending",
        )
        upsert_record(
            db,
            ProviderAccessRequestRecord,
            demo_uuid("provider-access:approved"),
            tenant_id=tenant_id,
            requested_by=user_records["integration_admin_northstar"].id,
            purpose="Migration planning for IAM provider switch",
            allowed_data_scope=["integration_config", "application_metadata"],
            expires_at=now + timedelta(days=30),
            status="approved",
        )
        upsert_record(
            db,
            ProviderAccessRequestRecord,
            demo_uuid("provider-access:denied"),
            tenant_id=tenant_id,
            requested_by=user_records["compliance_admin_northstar"].id,
            purpose="Historical audit extraction",
            allowed_data_scope=["all_data"],
            expires_at=now + timedelta(days=7),
            status="denied",
        )

        upsert_record(
            db,
            ComplianceReportRecord,
            demo_uuid("compliance-report:soc2"),
            tenant_id=tenant_id,
            framework="SOC2",
            scope_json={"window": "last_90_days", "includeEvidence": True},
            status="queued",
        )

        branding = db.query(BrandingConfigRecord).filter(BrandingConfigRecord.tenant_id == tenant_id).one_or_none()
        if branding is None:
            branding = BrandingConfigRecord(
                tenant_id=tenant_id,
                brand_name="Northstar Identity Operations",
                color_palette={
                    "primary": "#1D4ED8",
                    "secondary": "#0F766E",
                    "accent": "#7C3AED",
                    "surface": "#FFFFFF",
                    "text": "#0F172A",
                },
                fonts={
                    "primary": "Inter, system-ui, sans-serif",
                    "heading": "Poppins, Inter, system-ui, sans-serif",
                    "mono": "JetBrains Mono, ui-monospace, monospace",
                },
                logo_url="https://dummyimage.com/240x64/1d4ed8/ffffff&text=Northstar+IGA",
                background_image_url="https://dummyimage.com/1440x900/e5e7eb/111827&text=Northstar+Operations",
                custom_css=":root { --brand-radius: 14px; }",
                assets={"logo": [], "background": []},
            )
            db.add(branding)
        else:
            branding.brand_name = "Northstar Identity Operations"

        upsert_record(
            db,
            DashboardConfigRecord,
            demo_uuid("dashboard:tenant-admin"),
            tenant_id=tenant_id,
            user_id=user_records["tenant_admin_northstar"].id,
            name="Tenant Admin Operations",
            is_default=True,
            layout={"columns": 3},
            widgets=[
                {"id": "w-progress", "type": "progress", "title": "Onboarding Progress"},
                {"id": "w-errors", "type": "errors", "title": "Execution Errors"},
                {"id": "w-consents", "type": "approvals", "title": "Provider Access Requests"},
            ],
        )
        upsert_record(
            db,
            DashboardConfigRecord,
            demo_uuid("dashboard:app-owner"),
            tenant_id=tenant_id,
            user_id=user_records["app_owner_payments"].id,
            name="App Owner Focus Board",
            is_default=True,
            layout={"columns": 2},
            widgets=[
                {"id": "w-app-status", "type": "work-queue", "title": "Application Status"},
                {"id": "w-risk", "type": "risk", "title": "Risk Overview"},
            ],
        )

        upsert_record(
            db,
            ReportRecord,
            demo_uuid("report:health-overview"),
            tenant_id=tenant_id,
            user_id=user_records["tenant_admin_northstar"].id,
            title="Onboarding Health Overview",
            mode="filters",
            request_payload={"mode": "filters", "filters": {"status": "onboarded"}},
            summary="Strong onboarding health with 2 completed/onboarded applications and 1 high-priority failure.",
            data=[
                {"status": "completed", "count": 1},
                {"status": "onboarded", "count": 1},
                {"status": "draft", "count": 1},
                {"status": "failed", "count": 1},
                {"status": "in_progress", "count": 1},
            ],
            visualizations=[{"type": "bar", "title": "Applications by Status"}],
            status="completed",
        )
        upsert_record(
            db,
            ReportRecord,
            demo_uuid("report:exceptions"),
            tenant_id=tenant_id,
            user_id=user_records["compliance_admin_northstar"].id,
            title="Operational Exceptions Summary",
            mode="ai_prompt",
            request_payload={"mode": "ai_prompt", "prompt": "Show focus areas and errors"},
            summary="Two sync errors and one onboarding execution failure need immediate remediation.",
            data=[
                {"area": "Sync", "errors": 2, "priority": "high"},
                {"area": "Onboarding Execution", "errors": 1, "priority": "high"},
            ],
            visualizations=[{"type": "table", "title": "Exception Hotspots"}],
            status="completed",
        )

        for username, user in user_records.items():
            pref = (
                db.query(AccessibilityPreferenceRecord)
                .filter(AccessibilityPreferenceRecord.user_key == str(user.id))
                .one_or_none()
            )
            if pref is None:
                pref = AccessibilityPreferenceRecord(
                    user_key=str(user.id),
                    keyboard_only_mode=True,
                    focus_ring_style="default",
                    reduced_motion=False,
                    high_contrast_mode=False,
                    screen_reader_optimized=False,
                )
                db.add(pref)
            if username == "auditor_northstar":
                pref.reduced_motion = True
                pref.screen_reader_optimized = True

        db.commit()

        return {
            "tenantId": str(tenant_id),
            "tenantName": DEMO_TENANT_NAME,
            "credentials": {
                "password": DEMO_PASSWORD,
                "users": [
                    {"username": "platform_admin", "roles": ["platform_admin"]},
                    {"username": "tenant_admin_northstar", "roles": ["tenant_admin"]},
                    {"username": "app_owner_payments", "roles": ["app_owner"]},
                    {"username": "integration_admin_northstar", "roles": ["integration_admin"]},
                    {"username": "compliance_admin_northstar", "roles": ["compliance_admin"]},
                    {"username": "auditor_northstar", "roles": ["auditor"]},
                ],
            },
            "applications": [
                {"name": "Payroll Hub", "id": str(app_ids["payroll-hub"])},
                {"name": "Customer360 CRM", "id": str(app_ids["customer360-crm"])},
                {"name": "Privileged Vault Ops", "id": str(app_ids["privileged-vault-ops"])},
                {"name": "Access Review Studio", "id": str(app_ids["access-review-studio"])},
                {"name": "Workforce SSO Portal", "id": str(app_ids["workforce-sso-portal"])},
            ],
        }


def main() -> None:
    summary = seed_demo_data()
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
