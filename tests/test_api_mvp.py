from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from aop_api.main import app
from aop_api.store import store


def reset_store() -> None:
    store.tenants.clear()
    store.applications.clear()
    store.questionnaire_templates.clear()
    store.workflow_templates.clear()
    store.provider_access_requests.clear()
    store.auth_provider_configs.clear()
    store.sync_connector_configs.clear()
    store.sync_jobs.clear()
    store.executions.clear()
    store.compliance_reports.clear()
    store.accessibility_preferences.clear()
    store.ingests.clear()
    store.assignments.clear()
    store.exports.clear()


def test_tenant_application_and_instances_flow():
    reset_store()
    client = TestClient(app)

    tenant = client.post(
        "/tenants",
        json={
            "name": "Acme Corp",
            "region": "us-east-1",
            "isolationTier": "shared",
            "defaultLocale": "en-US",
            "supportedLocales": ["en-US", "fr-FR"],
        },
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
    )
    assert app_create.status_code == 201
    application_id = app_create.json()["id"]
    assert len(app_create.json()["instances"]) == 1

    new_instance = client.post(
        f"/applications/{application_id}/instances",
        json={"instanceName": "PROD", "environmentType": "prod", "region": "us-east-1"},
    )
    assert new_instance.status_code == 201
    instance_id = new_instance.json()["id"]

    update_instance = client.patch(
        f"/applications/{application_id}/instances/{instance_id}",
        json={"endpoint": "https://prod.payroll.example.com"},
    )
    assert update_instance.status_code == 200
    assert update_instance.json()["endpoint"] == "https://prod.payroll.example.com"

    instances = client.get(f"/applications/{application_id}/instances")
    assert instances.status_code == 200
    assert len(instances.json()["items"]) == 2


def test_identity_and_sync_integrations_flow():
    reset_store()
    client = TestClient(app)

    tenant = client.post(
        "/tenants",
        json={"name": "Contoso", "region": "eu-west-1", "isolationTier": "shared", "defaultLocale": "en-US"},
    )
    tenant_id = tenant.json()["id"]

    auth_catalog = client.get("/integrations/auth-providers/catalog")
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
    )
    assert auth_cfg.status_code == 201
    auth_cfg_id = auth_cfg.json()["id"]

    auth_update = client.patch(f"/integrations/auth-providers/{auth_cfg_id}", json={"status": "testing"})
    assert auth_update.status_code == 200
    assert auth_update.json()["status"] == "testing"

    sync_catalog = client.get("/integrations/sync/connectors/catalog")
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
    )
    assert sync_cfg.status_code == 201
    connector_id = sync_cfg.json()["id"]

    sync_run = client.post("/integrations/sync/jobs/run", json={"connectorId": connector_id, "runType": "manual"})
    assert sync_run.status_code == 202
    job_id = sync_run.json()["jobId"]

    job_status = client.get(f"/integrations/sync/jobs/{job_id}")
    assert job_status.status_code == 200
    assert job_status.json()["status"] == "completed"


def test_localization_accessibility_and_compliance_flow():
    reset_store()
    client = TestClient(app)

    locales = client.get("/i18n/locales")
    assert locales.status_code == 200
    assert any(item["locale"] == "en-US" for item in locales.json()["items"])

    bundle = client.get("/i18n/translations/common", params={"locale": "fr-FR"})
    assert bundle.status_code == 200
    assert bundle.json()["messages"]["task.submit"] == "Soumettre"

    prefs_before = client.get("/users/me/accessibility-preferences")
    assert prefs_before.status_code == 200
    assert prefs_before.json()["keyboardOnlyMode"] is True

    prefs_after = client.put(
        "/users/me/accessibility-preferences",
        json={"highContrastMode": True, "screenReaderOptimized": True},
    )
    assert prefs_after.status_code == 200
    assert prefs_after.json()["highContrastMode"] is True

    tenant = client.post(
        "/tenants",
        json={"name": "Fabrikam", "region": "us-west-2", "isolationTier": "shared", "defaultLocale": "en-US"},
    )
    tenant_id = tenant.json()["id"]

    frameworks = client.get("/compliance/frameworks")
    assert frameworks.status_code == 200
    assert any(item["name"] == "SOC2" for item in frameworks.json()["items"])

    report = client.post(
        "/compliance/reports/run",
        json={"tenantId": tenant_id, "framework": "SOC2", "scope": {"includeEvidence": True}},
    )
    assert report.status_code == 202
    assert report.json()["framework"] == "SOC2"


def test_onboarding_plan_execute_and_consent():
    reset_store()
    client = TestClient(app)

    tenant = client.post(
        "/tenants",
        json={"name": "Northwind", "region": "ap-south-1", "isolationTier": "shared", "defaultLocale": "en-US"},
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
    )
    application_id = app_create.json()["id"]

    plan = client.post(f"/applications/{application_id}/onboarding/plan")
    assert plan.status_code == 200
    assert plan.json()["connectorRecommendation"]["strategy"] in {"ootb", "custom"}

    execute = client.post(
        f"/applications/{application_id}/onboarding/execute",
        json={"targetVendorDomain": "SSO", "vendor": "Okta", "product": "Workforce Identity Cloud"},
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
    )
    assert consent_request.status_code == 201
    request_id = consent_request.json()["id"]

    consent_decision = client.put(
        "/consent/provider-access",
        json={"requestId": request_id, "decision": "approved", "decidedBy": str(uuid4())},
    )
    assert consent_decision.status_code == 200
    assert consent_decision.json()["decision"] == "approved"
