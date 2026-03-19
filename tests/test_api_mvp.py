from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

os.environ["AOP_DATABASE_URL"] = "sqlite+pysqlite:///./test_aop.db"
os.environ["AOP_JWT_SECRET_KEY"] = "test-secret-key-minimum-32-bytes!!"
os.environ["AOP_BOOTSTRAP_ADMIN_PASSWORD"] = "ChangeMe123!"

from aop_api.db import SessionLocal, reset_db_for_tests
from aop_api.main import app, seed_bootstrap_admin


@pytest.fixture(autouse=True)
def reset_database() -> None:
    reset_db_for_tests()
    with SessionLocal() as db:
        seed_bootstrap_admin(db)


def auth_headers(client: TestClient) -> dict[str, str]:
    token_resp = client.post("/auth/token", json={"username": "platform_admin", "password": "ChangeMe123!"})
    assert token_resp.status_code == 200
    token = token_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_requires_authentication():
    client = TestClient(app)
    response = client.get("/applications")
    assert response.status_code == 401


def test_tenant_application_and_instances_flow():
    client = TestClient(app)
    headers = auth_headers(client)

    tenant = client.post(
        "/tenants",
        json={
            "name": "Acme Corp",
            "region": "us-east-1",
            "isolationTier": "shared",
            "defaultLocale": "en-US",
            "supportedLocales": ["en-US", "fr-FR"],
        },
        headers=headers,
    )
    assert tenant.status_code == 201
    tenant_id = tenant.json()["id"]

    app_create = client.post(
        "/applications",
        json={
            "tenantId": tenant_id,
            "name": "Payroll SaaS",
            "businessCriticality": "high",
            "dataClassification": "confidential",
            "targetVendors": [{"domain": "SSO", "vendor": "Okta", "product": "Workforce Identity Cloud"}],
            "instances": [{"instanceName": "DEV", "environmentType": "dev"}],
        },
        headers=headers,
    )
    assert app_create.status_code == 201
    application_id = app_create.json()["id"]
    assert len(app_create.json()["instances"]) == 1

    new_instance = client.post(
        f"/applications/{application_id}/instances",
        json={"instanceName": "PROD", "environmentType": "prod", "region": "us-east-1"},
        headers=headers,
    )
    assert new_instance.status_code == 201
    instance_id = new_instance.json()["id"]

    update_instance = client.patch(
        f"/applications/{application_id}/instances/{instance_id}",
        json={"endpoint": "https://prod.payroll.example.com"},
        headers=headers,
    )
    assert update_instance.status_code == 200
    assert update_instance.json()["endpoint"] == "https://prod.payroll.example.com"

    instances = client.get(f"/applications/{application_id}/instances", headers=headers)
    assert instances.status_code == 200
    assert len(instances.json()["items"]) == 2


def test_identity_and_sync_integrations_flow():
    client = TestClient(app)
    headers = auth_headers(client)

    tenant = client.post(
        "/tenants",
        json={"name": "Contoso", "region": "eu-west-1", "isolationTier": "shared", "defaultLocale": "en-US"},
        headers=headers,
    )
    tenant_id = tenant.json()["id"]

    auth_catalog = client.get("/integrations/auth-providers/catalog", headers=headers)
    assert auth_catalog.status_code == 200
    assert len(auth_catalog.json()["items"]) > 0

    auth_cfg = client.post(
        "/integrations/auth-providers",
        json={
            "tenantId": tenant_id,
            "providerName": "Microsoft Entra ID",
            "protocol": "OIDC",
            "metadata": {"issuer": "https://login.microsoftonline.com/tenant/v2.0"},
            "claimMapping": {"groups": "roles"},
            "isPrimary": True,
            "loginPolicy": "always",
        },
        headers=headers,
    )
    assert auth_cfg.status_code == 201
    auth_cfg_id = auth_cfg.json()["id"]

    auth_update = client.patch(
        f"/integrations/auth-providers/{auth_cfg_id}",
        json={"status": "testing"},
        headers=headers,
    )
    assert auth_update.status_code == 200
    assert auth_update.json()["status"] == "testing"

    sync_catalog = client.get("/integrations/sync/connectors/catalog", headers=headers)
    assert sync_catalog.status_code == 200
    assert len(sync_catalog.json()["items"]) > 0

    sync_cfg = client.post(
        "/integrations/sync/connectors",
        json={
            "tenantId": tenant_id,
            "sourceCategory": "hr",
            "providerName": "Workday",
            "syncMode": "delta",
            "includeObjects": ["users", "employment"],
            "filterPolicy": {"department": ["Engineering"]},
        },
        headers=headers,
    )
    assert sync_cfg.status_code == 201
    connector_id = sync_cfg.json()["id"]

    sync_run = client.post(
        "/integrations/sync/jobs/run",
        json={"connectorId": connector_id, "runType": "manual"},
        headers=headers,
    )
    assert sync_run.status_code == 202
    job_id = sync_run.json()["jobId"]

    job_status = client.get(f"/integrations/sync/jobs/{job_id}", headers=headers)
    assert job_status.status_code == 200
    assert job_status.json()["status"] == "completed"


def test_localization_accessibility_and_compliance_flow():
    client = TestClient(app)
    headers = auth_headers(client)

    locales = client.get("/i18n/locales", headers=headers)
    assert locales.status_code == 200
    assert any(item["locale"] == "en-US" for item in locales.json()["items"])

    bundle = client.get("/i18n/translations/common", params={"locale": "fr-FR"}, headers=headers)
    assert bundle.status_code == 200
    assert bundle.json()["messages"]["task.submit"] == "Soumettre"

    prefs_before = client.get("/users/me/accessibility-preferences", headers=headers)
    assert prefs_before.status_code == 200
    assert prefs_before.json()["keyboardOnlyMode"] is True

    prefs_after = client.put(
        "/users/me/accessibility-preferences",
        json={"highContrastMode": True, "screenReaderOptimized": True},
        headers=headers,
    )
    assert prefs_after.status_code == 200
    assert prefs_after.json()["highContrastMode"] is True

    tenant = client.post(
        "/tenants",
        json={"name": "Fabrikam", "region": "us-west-2", "isolationTier": "shared", "defaultLocale": "en-US"},
        headers=headers,
    )
    tenant_id = tenant.json()["id"]

    frameworks = client.get("/compliance/frameworks", headers=headers)
    assert frameworks.status_code == 200
    assert any(item["name"] == "SOC2" for item in frameworks.json()["items"])

    report = client.post(
        "/compliance/reports/run",
        json={"tenantId": tenant_id, "framework": "SOC2", "scope": {"includeEvidence": True}},
        headers=headers,
    )
    assert report.status_code == 202
    assert report.json()["framework"] == "SOC2"


def test_onboarding_plan_execute_and_consent():
    client = TestClient(app)
    headers = auth_headers(client)

    tenant = client.post(
        "/tenants",
        json={"name": "Northwind", "region": "ap-south-1", "isolationTier": "shared", "defaultLocale": "en-US"},
        headers=headers,
    )
    tenant_id = tenant.json()["id"]

    app_create = client.post(
        "/applications",
        json={
            "tenantId": tenant_id,
            "name": "Identity Portal",
            "businessCriticality": "critical",
            "dataClassification": "restricted",
            "targetVendors": [{"domain": "SSO", "vendor": "Okta", "product": "Workforce Identity Cloud"}],
        },
        headers=headers,
    )
    application_id = app_create.json()["id"]

    plan = client.post(f"/applications/{application_id}/onboarding/plan", headers=headers)
    assert plan.status_code == 200
    assert plan.json()["connectorRecommendation"]["strategy"] in {"ootb", "custom"}

    execute = client.post(
        f"/applications/{application_id}/onboarding/execute",
        json={"targetVendorDomain": "SSO", "vendor": "Okta", "product": "Workforce Identity Cloud"},
        headers=headers,
    )
    assert execute.status_code == 202
    assert execute.json()["status"] == "queued"

    consent_request = client.post(
        "/consent/provider-access",
        json={
            "tenantId": tenant_id,
            "requestedBy": str(uuid4()),
            "purpose": "support",
            "allowedDataScope": ["applications", "workflows"],
            "expiresAt": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
        headers=headers,
    )
    assert consent_request.status_code == 201
    request_id = consent_request.json()["id"]

    consent_decision = client.put(
        "/consent/provider-access",
        json={"requestId": request_id, "decision": "approved", "decidedBy": str(uuid4())},
        headers=headers,
    )
    assert consent_decision.status_code == 200
    assert consent_decision.json()["decision"] == "approved"
