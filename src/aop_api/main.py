from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID

from fastapi import FastAPI, HTTPException, Query, status

from .models import (
    AccessibilityPreferences,
    Application,
    ApplicationInstance,
    AssignQuestionnaireRequest,
    AuthProviderConfig,
    ComplianceReportRequest,
    ComplianceReportResponse,
    ConnectorDefinition,
    ConnectorSearchRequest,
    CreateApplicationInstanceRequest,
    CreateApplicationRequest,
    CreateAuthProviderConfigRequest,
    CreateSyncConnectorConfigRequest,
    CreateTenantRequest,
    CustomConnectorScaffoldRequest,
    ExecuteOnboardingRequest,
    ExecutionResponse,
    ExportRequest,
    OnboardingPlan,
    ProviderAccessDecision,
    ProviderAccessRequest,
    QuestionnaireAssignment,
    QuestionnaireAssignmentResult,
    QuestionnaireTemplate,
    RunSyncJobRequest,
    RunStatus,
    SyncConnectorConfig,
    SyncJobResponse,
    TranslationBundle,
    UpdateApplicationInstanceRequest,
    UpdateAuthProviderConfigRequest,
    UpsertAccessibilityPreferencesRequest,
    WorkflowTemplate,
    utcnow,
)
from .store import store

app = FastAPI(
    title="Application Onboarding Platform API",
    version="0.1.0",
    summary="API-first multi-tenant onboarding for IGA/IAM/PAM/SSO",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/tenants", status_code=status.HTTP_201_CREATED)
def create_tenant(request: CreateTenantRequest):
    tenant = request.model_copy(update={"supportedLocales": request.supportedLocales or [request.defaultLocale]})
    created = tenant.__class__.model_validate({"id": None}) if False else None  # no-op for mypy parity
    del created
    from .models import Tenant

    tenant_model = Tenant(
        name=tenant.name,
        region=tenant.region,
        isolationTier=tenant.isolationTier,
        defaultLocale=tenant.defaultLocale,
        supportedLocales=tenant.supportedLocales,
    )
    store.tenants[tenant_model.id] = tenant_model
    return tenant_model


@app.post("/applications", status_code=status.HTTP_201_CREATED)
def create_application(request: CreateApplicationRequest):
    if request.tenantId not in store.tenants:
        raise HTTPException(status_code=404, detail="Tenant not found")

    app_model = Application(
        tenantId=request.tenantId,
        name=request.name,
        businessCriticality=request.businessCriticality,
        dataClassification=request.dataClassification,
        targetVendors=request.targetVendors,
    )

    for instance_request in request.instances:
        app_model.instances.append(
            ApplicationInstance(
                applicationId=app_model.id,
                instanceName=instance_request.instanceName,
                environmentType=instance_request.environmentType,
                endpoint=instance_request.endpoint,
                region=instance_request.region,
                connectorProfileId=instance_request.connectorProfileId,
                secretReference=instance_request.secretReference,
            )
        )

    store.applications[app_model.id] = app_model
    return app_model


@app.get("/applications")
def list_applications(environment: str | None = Query(default=None), status: str | None = Query(default=None)):
    apps = list(store.applications.values())
    if status:
        apps = [item for item in apps if item.status == status]
    if environment:
        apps = [
            item
            for item in apps
            if any(instance.environmentType.value == environment for instance in item.instances)
        ]
    return {"items": apps}


@app.post("/applications/{application_id}/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest_application_data(application_id: UUID, request: dict[str, Any]):
    if application_id not in store.applications:
        raise HTTPException(status_code=404, detail="Application not found")
    record = {"applicationId": str(application_id), "ingestedAt": utcnow().isoformat(), **request}
    store.ingests.append(record)
    return {"status": "accepted"}


@app.get("/applications/{application_id}/instances")
def list_application_instances(application_id: UUID):
    app_model = store.applications.get(application_id)
    if not app_model:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"items": app_model.instances}


@app.post("/applications/{application_id}/instances", status_code=status.HTTP_201_CREATED)
def create_application_instance(application_id: UUID, request: CreateApplicationInstanceRequest):
    app_model = store.applications.get(application_id)
    if not app_model:
        raise HTTPException(status_code=404, detail="Application not found")
    instance = ApplicationInstance(
        applicationId=application_id,
        instanceName=request.instanceName,
        environmentType=request.environmentType,
        endpoint=request.endpoint,
        region=request.region,
        connectorProfileId=request.connectorProfileId,
        secretReference=request.secretReference,
    )
    app_model.instances.append(instance)
    return instance


@app.patch("/applications/{application_id}/instances/{instance_id}")
def update_application_instance(application_id: UUID, instance_id: UUID, request: UpdateApplicationInstanceRequest):
    app_model = store.applications.get(application_id)
    if not app_model:
        raise HTTPException(status_code=404, detail="Application not found")
    for idx, instance in enumerate(app_model.instances):
        if instance.id == instance_id:
            updated = instance.model_copy(update=request.model_dump(exclude_none=True))
            app_model.instances[idx] = updated
            return updated
    raise HTTPException(status_code=404, detail="Instance not found")


@app.post("/applications/{application_id}/questionnaires/assign")
def assign_questionnaires(application_id: UUID, request: AssignQuestionnaireRequest):
    if application_id not in store.applications:
        raise HTTPException(status_code=404, detail="Application not found")

    assignments = [
        QuestionnaireAssignment(
            assignedToUserId=stakeholder.userId,
            dueDate=utcnow() + timedelta(days=7),
        )
        for stakeholder in request.stakeholders
    ]
    result = QuestionnaireAssignmentResult(applicationId=application_id, assignments=assignments)
    store.assignments.append(result.model_dump(mode="json"))
    return result


@app.post("/questionnaire-templates")
def upsert_questionnaire_template(request: QuestionnaireTemplate):
    store.questionnaire_templates[request.id] = request
    return request


@app.post("/workflow-templates", status_code=status.HTTP_201_CREATED)
def create_workflow_template(request: WorkflowTemplate):
    store.workflow_templates[request.id] = request
    return request


@app.post("/applications/{application_id}/onboarding/plan")
def generate_onboarding_plan(application_id: UUID):
    app_model = store.applications.get(application_id)
    if not app_model:
        raise HTTPException(status_code=404, detail="Application not found")

    recommendation = {
        "strategy": "custom",
        "confidence": 0.65,
        "rationale": "No direct OOTB connector match found in target profile.",
    }
    for target in app_model.targetVendors:
        match = next(
            (
                connector
                for connector in store.connector_catalog
                if connector.domain == target.domain
                and connector.vendor.lower() == target.vendor.lower()
                and connector.product.lower() == target.product.lower()
            ),
            None,
        )
        if match:
            recommendation = {
                "strategy": "ootb",
                "confidence": 0.92,
                "rationale": f"Matched OOTB connector: {match.vendor} {match.product}",
            }
            break

    score, level = store.score_for(app_model.dataClassification, app_model.businessCriticality)
    return OnboardingPlan(
        applicationId=application_id,
        connectorRecommendation=recommendation,
        riskScore={
            "score": score,
            "level": level,
            "factors": [app_model.dataClassification, app_model.businessCriticality],
        },
    )


@app.post("/applications/{application_id}/onboarding/execute", status_code=status.HTTP_202_ACCEPTED)
def execute_onboarding(application_id: UUID, request: ExecuteOnboardingRequest):
    if application_id not in store.applications:
        raise HTTPException(status_code=404, detail="Application not found")
    response = ExecutionResponse(status=RunStatus.queued)
    store.executions[response.executionId] = {
        "applicationId": str(application_id),
        "request": request.model_dump(mode="json"),
        "status": response.status.value,
    }
    return response


@app.post("/connectors/catalog/search")
def search_connectors(request: ConnectorSearchRequest):
    items = [
        connector
        for connector in store.connector_catalog
        if connector.domain == request.domain
        and connector.vendor.lower() == request.vendor.lower()
        and connector.product.lower() == request.product.lower()
    ]
    return {"items": items}


@app.post("/connectors/custom/scaffold", status_code=status.HTTP_201_CREATED)
def scaffold_custom_connector(request: CustomConnectorScaffoldRequest):
    connector = ConnectorDefinition(
        domain=request.targetVendorDomain,
        vendor="CustomVendor",
        product=f"Custom-{str(request.applicationId)[:8]}",
        type="custom",
        operations=["create", "update", "disable", "reconcile"],
        status="draft",
    )
    store.connector_catalog.append(connector)
    return connector


@app.post("/exports/configuration", status_code=status.HTTP_202_ACCEPTED)
def export_configuration(request: ExportRequest):
    store.exports.append({"requestedAt": utcnow().isoformat(), **request.model_dump(mode="json")})
    return {"status": "queued"}


@app.post("/consent/provider-access", status_code=status.HTTP_201_CREATED)
def request_provider_access(request: ProviderAccessRequest):
    store.provider_access_requests[request.id] = request
    return request


@app.put("/consent/provider-access")
def decide_provider_access(request: ProviderAccessDecision):
    existing = store.provider_access_requests.get(request.requestId)
    if not existing:
        raise HTTPException(status_code=404, detail="Access request not found")
    updated = existing.model_copy(update={"status": request.decision})
    store.provider_access_requests[request.requestId] = updated
    return {"requestId": request.requestId, "decision": request.decision}


@app.get("/integrations/auth-providers/catalog")
def list_auth_provider_catalog():
    return {"items": store.auth_provider_catalog}


@app.post("/integrations/auth-providers", status_code=status.HTTP_201_CREATED)
def create_auth_provider_config(request: CreateAuthProviderConfigRequest):
    if request.tenantId not in store.tenants:
        raise HTTPException(status_code=404, detail="Tenant not found")
    config = AuthProviderConfig(**request.model_dump())
    store.auth_provider_configs[config.id] = config.model_dump(mode="json")
    return config


@app.get("/integrations/auth-providers")
def list_auth_provider_configs():
    return {"items": list(store.auth_provider_configs.values())}


@app.patch("/integrations/auth-providers/{provider_config_id}")
def update_auth_provider_config(provider_config_id: UUID, request: UpdateAuthProviderConfigRequest):
    existing = store.auth_provider_configs.get(provider_config_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Auth provider config not found")
    merged = {**existing, **request.model_dump(exclude_none=True)}
    store.auth_provider_configs[provider_config_id] = merged
    return merged


@app.get("/integrations/sync/connectors/catalog")
def list_sync_connector_catalog():
    return {"items": store.sync_connector_catalog}


@app.post("/integrations/sync/connectors", status_code=status.HTTP_201_CREATED)
def create_sync_connector_config(request: CreateSyncConnectorConfigRequest):
    if request.tenantId not in store.tenants:
        raise HTTPException(status_code=404, detail="Tenant not found")
    config = SyncConnectorConfig(**request.model_dump())
    store.sync_connector_configs[config.id] = config.model_dump(mode="json")
    return config


@app.get("/integrations/sync/connectors")
def list_sync_connector_configs():
    return {"items": list(store.sync_connector_configs.values())}


@app.post("/integrations/sync/jobs/run", status_code=status.HTTP_202_ACCEPTED)
def run_sync_job(request: RunSyncJobRequest):
    if request.connectorId not in store.sync_connector_configs:
        raise HTTPException(status_code=404, detail="Sync connector config not found")
    response = SyncJobResponse(
        connectorId=request.connectorId,
        runType=request.runType,
        status=RunStatus.completed,
        stats={
            "usersProcessed": 25 if not request.dryRun else 0,
            "applicationsProcessed": 7 if not request.dryRun else 0,
            "errors": 0,
        },
    )
    store.sync_jobs[response.jobId] = response
    return response


@app.get("/integrations/sync/jobs/{job_id}")
def get_sync_job_status(job_id: UUID):
    job = store.sync_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    return job


@app.get("/i18n/locales")
def list_supported_locales():
    return {"items": store.locales}


@app.get("/i18n/translations/{namespace}")
def get_translation_bundle(namespace: str, locale: str):
    bundle: TranslationBundle = store.get_translation(namespace, locale)
    return bundle


@app.get("/users/me/accessibility-preferences")
def get_my_accessibility_preferences():
    return store.accessibility_preferences.get("me", AccessibilityPreferences())


@app.put("/users/me/accessibility-preferences")
def update_my_accessibility_preferences(request: UpsertAccessibilityPreferencesRequest):
    existing = store.accessibility_preferences.get("me", AccessibilityPreferences())
    updated = existing.model_copy(update=request.model_dump(exclude_none=True))
    store.accessibility_preferences["me"] = updated
    return updated


@app.get("/compliance/frameworks")
def list_compliance_frameworks():
    return {"items": store.compliance_frameworks}


@app.post("/compliance/reports/run", status_code=status.HTTP_202_ACCEPTED)
def run_compliance_report(request: ComplianceReportRequest):
    report = ComplianceReportResponse(framework=request.framework, status=RunStatus.queued)
    store.compliance_reports[report.reportId] = {
        "tenantId": str(request.tenantId),
        "framework": request.framework,
        "scope": request.scope,
        "status": report.status.value,
    }
    return report
