from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
import re
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session, selectinload

from .catalogs import (
    TRANSLATIONS,
    auth_provider_catalog,
    connector_catalog,
    frameworks_catalog,
    locales_catalog,
    sync_connector_catalog,
)
from .config import SUPPORTED_RELATIONAL_DIALECTS, database_dialect, settings
from .db import SessionLocal, get_db, init_db
from .db_models import (
    AccessibilityPreferenceRecord,
    ApplicationInstanceRecord,
    ApplicationRecord,
    AuthProviderConfigRecord,
    BrandingConfigRecord,
    ComplianceReportRecord,
    DashboardConfigRecord,
    ExecutionRecord,
    ExportRecord,
    IngestRecord,
    ProviderAccessRequestRecord,
    QuestionnaireTemplateRecord,
    SyncConnectorConfigRecord,
    SyncJobRecord,
    TenantRecord,
    UserRecord,
    WorkflowTemplateRecord,
    ReportRecord,
)
from .graph import graph_adapter
from .models import (
    AccessibilityPreferences,
    Application,
    ApplicationInstance,
    AssignQuestionnaireRequest,
    AuthProviderConfig,
    AuthTokenRequest,
    AuthTokenResponse,
    BrandingAssetType,
    BrandingAssetUploadResponse,
    BrandingConfig,
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
    IngestRequest,
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
    Tenant,
    TranslationBundle,
    DashboardConfig,
    DashboardAnalyticsResponse,
    ReportGenerateRequest,
    ReportMode,
    ReportResult,
    UpdateApplicationInstanceRequest,
    UpdateAuthProviderConfigRequest,
    UpsertAccessibilityPreferencesRequest,
    UpsertBrandingConfigRequest,
    UpsertDashboardConfigRequest,
    WorkflowTemplate,
    new_uuid,
    utcnow,
)
from .policy import enforce_tenant_scope, require_permissions
from .security import Principal, authenticate, create_access_token, get_current_principal, hash_password

def score_for(classification: str, criticality: str) -> tuple[float, str]:
    class_points = {
        "public": 10,
        "internal": 25,
        "confidential": 55,
        "restricted": 80,
    }.get(classification.lower(), 25)
    critical_points = {
        "low": 10,
        "medium": 25,
        "high": 45,
        "critical": 70,
    }.get(criticality.lower(), 25)
    total = min(100.0, float(class_points + critical_points) / 2.0)
    if total >= 75:
        return total, "critical"
    if total >= 55:
        return total, "high"
    if total >= 30:
        return total, "medium"
    return total, "low"


ALLOWED_REPORT_TABLES = {
    "applications",
    "application_instances",
    "executions",
    "sync_jobs",
    "provider_access_requests",
    "compliance_reports",
}
FORBIDDEN_SQL_TOKENS = {
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "grant",
    "revoke",
    "truncate",
    "attach",
    "detach",
    "pragma",
}


def ensure_upload_dir() -> None:
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


def safe_report_limit(limit: int) -> int:
    return max(1, min(500, limit))


def validate_safe_sql(sql_query: str) -> str:
    query = sql_query.strip()
    normalized = re.sub(r"\s+", " ", query).lower()
    if ";" in normalized or "--" in normalized or "/*" in normalized:
        raise HTTPException(status_code=400, detail="Unsafe SQL constructs are not allowed")
    if not normalized.startswith("select "):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
    if any(token in normalized for token in FORBIDDEN_SQL_TOKENS):
        raise HTTPException(status_code=400, detail="Unsafe SQL keyword detected")
    if not any(f" {table}" in normalized for table in ALLOWED_REPORT_TABLES):
        raise HTTPException(status_code=400, detail="Query must target approved reporting tables")
    return query


def require_platform_admin(principal: Principal = Depends(get_current_principal)) -> Principal:
    if "platform_admin" not in principal.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin required")
    return principal


def seed_bootstrap_admin(db: Session) -> None:
    existing = db.query(UserRecord).filter(UserRecord.username == settings.bootstrap_admin_username).one_or_none()
    if existing:
        return
    admin = UserRecord(
        username=settings.bootstrap_admin_username,
        password_hash=hash_password(settings.bootstrap_admin_password),
        tenant_id=None,
        roles=["platform_admin"],
        is_active=True,
    )
    db.add(admin)
    db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    ensure_upload_dir()
    with SessionLocal() as db:
        seed_bootstrap_admin(db)
    yield


app = FastAPI(
    title="Application Onboarding Platform API",
    version="0.2.0",
    summary="Production-oriented API-first onboarding for IGA/IAM/PAM/SSO",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
    return response


def to_tenant_model(record: TenantRecord) -> Tenant:
    return Tenant(
        id=record.id,
        name=record.name,
        region=record.region,
        isolationTier=record.isolation_tier,
        defaultLocale=record.default_locale,
        supportedLocales=list(record.supported_locales),
    )


def to_instance_model(record: ApplicationInstanceRecord) -> ApplicationInstance:
    return ApplicationInstance(
        id=record.id,
        applicationId=record.application_id,
        instanceName=record.instance_name,
        environmentType=record.environment_type,
        endpoint=record.endpoint,
        region=record.region,
        connectorProfileId=record.connector_profile_id,
        secretReference=record.secret_reference,
        status=record.status,
    )


def to_application_model(record: ApplicationRecord) -> Application:
    return Application(
        id=record.id,
        tenantId=record.tenant_id,
        name=record.name,
        businessCriticality=record.business_criticality,
        dataClassification=record.data_classification,
        status=record.status,
        targetVendors=record.target_vendors,
        instances=[to_instance_model(item) for item in record.instances],
    )


def to_branding_model(record: BrandingConfigRecord) -> BrandingConfig:
    return BrandingConfig(
        tenantId=record.tenant_id,
        brandName=record.brand_name,
        colorPalette=record.color_palette or {},
        fonts=record.fonts or {},
        logoUrl=record.logo_url,
        backgroundImageUrl=record.background_image_url,
        customCss=record.custom_css,
        assets=record.assets or {},
        updatedAt=record.updated_at,
    )


def to_dashboard_model(record: DashboardConfigRecord) -> DashboardConfig:
    return DashboardConfig(
        id=record.id,
        tenantId=record.tenant_id,
        userId=record.user_id,
        name=record.name,
        isDefault=record.is_default,
        layout=record.layout or {},
        widgets=record.widgets or [],
    )


def to_report_model(record: ReportRecord) -> ReportResult:
    return ReportResult(
        id=record.id,
        tenantId=record.tenant_id,
        title=record.title,
        mode=record.mode,
        status=record.status,
        summary=record.summary,
        data=record.data or [],
        visualizations=record.visualizations or [],
        generatedAt=record.generated_at,
    )


def get_application_or_404(db: Session, application_id: UUID) -> ApplicationRecord:
    app_record = (
        db.query(ApplicationRecord)
        .options(selectinload(ApplicationRecord.instances))
        .filter(ApplicationRecord.id == application_id)
        .one_or_none()
    )
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")
    return app_record


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/system/database-capabilities")
def database_capabilities():
    return {
        "relational": {
            "currentDialect": database_dialect(settings.database_url),
            "supportedDialects": sorted(SUPPORTED_RELATIONAL_DIALECTS),
            "databaseUrl": settings.database_url,
        },
        "graph": {
            "enabled": graph_adapter.enabled,
            "provider": graph_adapter.provider,
            "urlConfigured": bool(settings.graph_database_url),
        },
        "cloudFlavors": {
            "aws": ["RDS PostgreSQL/MySQL", "Aurora", "RDS SQL Server", "RDS Oracle"],
            "azure": ["Azure Database for PostgreSQL/MySQL", "Azure SQL", "CosmosDB (graph via Gremlin)"],
            "gcp": ["Cloud SQL PostgreSQL/MySQL/SQL Server", "AlloyDB", "Spanner (via adapter)"],
            "onPrem": ["PostgreSQL", "MySQL/MariaDB", "SQL Server", "Oracle", "SQLite"],
            "graph": ["Neo4j"],
        },
    }


@app.post("/auth/token")
def create_token(request: AuthTokenRequest, db: Session = Depends(get_db)):
    user = authenticate(db, request.username, request.password)
    token = create_access_token(user)
    return AuthTokenResponse(access_token=token, expires_in=settings.jwt_exp_minutes * 60)


@app.post("/tenants", status_code=status.HTTP_201_CREATED)
def create_tenant(
    request: CreateTenantRequest,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_platform_admin),
):
    tenant = TenantRecord(
        name=request.name,
        region=request.region,
        isolation_tier=request.isolationTier.value,
        default_locale=request.defaultLocale,
        supported_locales=request.supportedLocales or [request.defaultLocale],
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return to_tenant_model(tenant)


@app.get("/tenants/{tenant_id}/branding")
def get_tenant_branding(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("branding:read")),
):
    enforce_tenant_scope(principal, tenant_id)
    record = db.query(BrandingConfigRecord).filter(BrandingConfigRecord.tenant_id == tenant_id).one_or_none()
    if not record:
        return BrandingConfig(tenantId=tenant_id)
    return to_branding_model(record)


@app.put("/tenants/{tenant_id}/branding")
def upsert_tenant_branding(
    tenant_id: UUID,
    request: UpsertBrandingConfigRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("branding:write")),
):
    enforce_tenant_scope(principal, tenant_id)
    tenant = db.query(TenantRecord).filter(TenantRecord.id == tenant_id).one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    record = db.query(BrandingConfigRecord).filter(BrandingConfigRecord.tenant_id == tenant_id).one_or_none()
    if not record:
        record = BrandingConfigRecord(tenant_id=tenant_id)
        db.add(record)
    payload = request.model_dump(exclude_none=True)
    if "brandName" in payload:
        record.brand_name = payload["brandName"]
    if "colorPalette" in payload:
        record.color_palette = payload["colorPalette"]
    if "fonts" in payload:
        record.fonts = payload["fonts"]
    if "logoUrl" in payload:
        record.logo_url = payload["logoUrl"]
    if "backgroundImageUrl" in payload:
        record.background_image_url = payload["backgroundImageUrl"]
    if "customCss" in payload:
        record.custom_css = payload["customCss"]
    db.commit()
    db.refresh(record)
    return to_branding_model(record)


@app.post("/tenants/{tenant_id}/branding/assets")
async def upload_branding_asset(
    tenant_id: UUID,
    assetType: BrandingAssetType = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("branding:write")),
):
    enforce_tenant_scope(principal, tenant_id)
    tenant = db.query(TenantRecord).filter(TenantRecord.id == tenant_id).one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    contents = await file.read()
    size = len(contents)
    if size <= 0:
        raise HTTPException(status_code=400, detail="Empty file upload is not allowed")
    if size > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File exceeds maximum allowed upload size")

    extension = Path(file.filename or "asset.bin").suffix.lower()
    allowed_extensions = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ttf", ".otf", ".woff", ".woff2", ".json"}
    if extension and extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Unsupported asset file type")

    tenant_dir = Path(settings.upload_dir) / str(tenant_id)
    tenant_dir.mkdir(parents=True, exist_ok=True)
    saved_name = f"{assetType.value}_{new_uuid().hex}{extension or '.bin'}"
    saved_path = tenant_dir / saved_name
    saved_path.write_bytes(contents)

    record = db.query(BrandingConfigRecord).filter(BrandingConfigRecord.tenant_id == tenant_id).one_or_none()
    if not record:
        record = BrandingConfigRecord(tenant_id=tenant_id)
        db.add(record)
    assets = record.assets or {}
    asset_bucket = assets.get(assetType.value, [])
    asset_bucket.append(str(saved_path))
    assets[assetType.value] = asset_bucket
    record.assets = assets
    if assetType == BrandingAssetType.logo:
        record.logo_url = str(saved_path)
    if assetType == BrandingAssetType.background:
        record.background_image_url = str(saved_path)
    db.commit()

    return BrandingAssetUploadResponse(
        assetType=assetType,
        fileName=saved_name,
        filePath=str(saved_path),
        contentType=file.content_type or "application/octet-stream",
        sizeBytes=size,
    )


@app.post("/applications", status_code=status.HTTP_201_CREATED)
def create_application(
    request: CreateApplicationRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("application:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    tenant = db.query(TenantRecord).filter(TenantRecord.id == request.tenantId).one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    app_record = ApplicationRecord(
        tenant_id=request.tenantId,
        name=request.name,
        business_criticality=request.businessCriticality,
        data_classification=request.dataClassification,
        target_vendors=[item.model_dump(mode="json") for item in request.targetVendors],
    )
    db.add(app_record)
    db.flush()
    for instance in request.instances:
        instance_record = ApplicationInstanceRecord(
            application_id=app_record.id,
            instance_name=instance.instanceName,
            environment_type=instance.environmentType.value,
            endpoint=instance.endpoint,
            region=instance.region,
            connector_profile_id=instance.connectorProfileId,
            secret_reference=instance.secretReference.model_dump(mode="json") if instance.secretReference else None,
        )
        db.add(instance_record)
        graph_adapter.upsert_application_instance(
            application_id=str(app_record.id),
            instance_id=str(instance_record.id),
            environment_type=instance.environmentType.value,
            tenant_id=str(request.tenantId),
        )
    db.commit()
    db.refresh(app_record)
    db.refresh(app_record, attribute_names=["instances"])
    return to_application_model(app_record)


@app.get("/applications")
def list_applications(
    environment: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    tenantId: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("application:read")),
):
    query = db.query(ApplicationRecord).options(selectinload(ApplicationRecord.instances))
    if "platform_admin" not in principal.roles:
        if not principal.tenant_id:
            return {"items": []}
        query = query.filter(ApplicationRecord.tenant_id == principal.tenant_id)
    elif tenantId:
        query = query.filter(ApplicationRecord.tenant_id == tenantId)
    if status_filter:
        query = query.filter(ApplicationRecord.status == status_filter)
    items = query.all()
    if environment:
        items = [item for item in items if any(i.environment_type == environment for i in item.instances)]
    return {"items": [to_application_model(item) for item in items]}


@app.post("/applications/{application_id}/ingest", status_code=status.HTTP_202_ACCEPTED)
def ingest_application_data(
    application_id: UUID,
    request: IngestRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("application:write")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    ingest = IngestRecord(
        application_id=application_id,
        source_type=request.sourceType,
        payload=request.payload,
    )
    db.add(ingest)
    db.commit()
    return {"status": "accepted"}


@app.get("/applications/{application_id}/instances")
def list_application_instances(
    application_id: UUID,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("application:read")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    return {"items": [to_instance_model(item) for item in app_record.instances]}


@app.post("/applications/{application_id}/instances", status_code=status.HTTP_201_CREATED)
def create_application_instance(
    application_id: UUID,
    request: CreateApplicationInstanceRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("application:write")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    instance_record = ApplicationInstanceRecord(
        application_id=application_id,
        instance_name=request.instanceName,
        environment_type=request.environmentType.value,
        endpoint=request.endpoint,
        region=request.region,
        connector_profile_id=request.connectorProfileId,
        secret_reference=request.secretReference.model_dump(mode="json") if request.secretReference else None,
    )
    db.add(instance_record)
    db.commit()
    db.refresh(instance_record)
    graph_adapter.upsert_application_instance(
        application_id=str(application_id),
        instance_id=str(instance_record.id),
        environment_type=request.environmentType.value,
        tenant_id=str(app_record.tenant_id),
    )
    return to_instance_model(instance_record)


@app.patch("/applications/{application_id}/instances/{instance_id}")
def update_application_instance(
    application_id: UUID,
    instance_id: UUID,
    request: UpdateApplicationInstanceRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("application:write")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    instance_record = (
        db.query(ApplicationInstanceRecord)
        .filter(
            ApplicationInstanceRecord.id == instance_id,
            ApplicationInstanceRecord.application_id == application_id,
        )
        .one_or_none()
    )
    if not instance_record:
        raise HTTPException(status_code=404, detail="Instance not found")
    payload = request.model_dump(exclude_none=True)
    if "instanceName" in payload:
        instance_record.instance_name = payload["instanceName"]
    if "environmentType" in payload:
        instance_record.environment_type = payload["environmentType"].value
    if "endpoint" in payload:
        instance_record.endpoint = payload["endpoint"]
    if "region" in payload:
        instance_record.region = payload["region"]
    if "connectorProfileId" in payload:
        instance_record.connector_profile_id = payload["connectorProfileId"]
    if "secretReference" in payload:
        value = payload["secretReference"]
        instance_record.secret_reference = value.model_dump(mode="json") if value else None
    db.commit()
    db.refresh(instance_record)
    return to_instance_model(instance_record)


@app.post("/applications/{application_id}/questionnaires/assign")
def assign_questionnaires(
    application_id: UUID,
    request: AssignQuestionnaireRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("workflow:write")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    assignments = [
        QuestionnaireAssignment(assignedToUserId=stakeholder.userId, dueDate=utcnow() + timedelta(days=7))
        for stakeholder in request.stakeholders
    ]
    return QuestionnaireAssignmentResult(applicationId=application_id, assignments=assignments)


@app.post("/questionnaire-templates")
def upsert_questionnaire_template(
    request: QuestionnaireTemplate,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_permissions("workflow:write")),
):
    record = db.query(QuestionnaireTemplateRecord).filter(QuestionnaireTemplateRecord.id == request.id).one_or_none()
    if not record:
        record = QuestionnaireTemplateRecord(id=request.id)
        db.add(record)
    record.version = request.version
    record.name = request.name
    record.sections = request.sections
    db.commit()
    return request


@app.post("/workflow-templates", status_code=status.HTTP_201_CREATED)
def create_workflow_template(
    request: WorkflowTemplate,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_permissions("workflow:write")),
):
    record = WorkflowTemplateRecord(
        id=request.id, version=request.version, name=request.name, nodes=request.nodes, transitions=request.transitions
    )
    db.add(record)
    db.commit()
    return request


@app.post("/applications/{application_id}/onboarding/plan")
def generate_onboarding_plan(
    application_id: UUID,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("onboarding:plan")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    recommendation = {
        "strategy": "custom",
        "confidence": 0.65,
        "rationale": "No direct OOTB connector match found in target profile.",
    }
    for target in app_record.target_vendors:
        match = next(
            (
                item
                for item in connector_catalog()
                if item.domain.value == target["domain"]
                and item.vendor.lower() == target["vendor"].lower()
                and item.product.lower() == target["product"].lower()
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
    score, level = score_for(app_record.data_classification, app_record.business_criticality)
    return OnboardingPlan(
        applicationId=application_id,
        connectorRecommendation=recommendation,
        riskScore={
            "score": score,
            "level": level,
            "factors": [app_record.data_classification, app_record.business_criticality],
        },
    )


@app.post("/applications/{application_id}/onboarding/execute", status_code=status.HTTP_202_ACCEPTED)
def execute_onboarding(
    application_id: UUID,
    request: ExecuteOnboardingRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("onboarding:execute")),
):
    app_record = get_application_or_404(db, application_id)
    enforce_tenant_scope(principal, app_record.tenant_id)
    response = ExecutionResponse(status=RunStatus.queued)
    db.add(
        ExecutionRecord(
            id=response.executionId,
            application_id=application_id,
            request_json=request.model_dump(mode="json"),
            status=response.status.value,
        )
    )
    db.commit()
    return response


@app.post("/connectors/catalog/search")
def search_connectors(
    request: ConnectorSearchRequest,
    _: Principal = Depends(require_permissions("integration:read")),
):
    items = [
        connector
        for connector in connector_catalog()
        if connector.domain == request.domain
        and connector.vendor.lower() == request.vendor.lower()
        and connector.product.lower() == request.product.lower()
    ]
    return {"items": items}


@app.post("/connectors/custom/scaffold", status_code=status.HTTP_201_CREATED)
def scaffold_custom_connector(
    request: CustomConnectorScaffoldRequest,
    _: Principal = Depends(require_permissions("integration:write")),
):
    connector = ConnectorDefinition(
        domain=request.targetVendorDomain,
        vendor="CustomVendor",
        product=f"Custom-{str(request.applicationId)[:8]}",
        type="custom",
        operations=["create", "update", "disable", "reconcile"],
        status="draft",
    )
    return connector


@app.post("/exports/configuration", status_code=status.HTTP_202_ACCEPTED)
def export_configuration(
    request: ExportRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    db.add(ExportRecord(tenant_id=request.tenantId, payload=request.model_dump(mode="json")))
    db.commit()
    return {"status": "queued"}


@app.post("/consent/provider-access", status_code=status.HTTP_201_CREATED)
def request_provider_access(
    request: ProviderAccessRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("consent:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    record = ProviderAccessRequestRecord(
        id=request.id,
        tenant_id=request.tenantId,
        requested_by=request.requestedBy,
        purpose=request.purpose,
        allowed_data_scope=request.allowedDataScope,
        expires_at=request.expiresAt,
        status=request.status,
    )
    db.add(record)
    db.commit()
    return request


@app.put("/consent/provider-access")
def decide_provider_access(
    request: ProviderAccessDecision,
    db: Session = Depends(get_db),
    _: Principal = Depends(require_permissions("consent:write")),
):
    existing = db.query(ProviderAccessRequestRecord).filter(ProviderAccessRequestRecord.id == request.requestId).one_or_none()
    if not existing:
        raise HTTPException(status_code=404, detail="Access request not found")
    existing.status = request.decision
    db.commit()
    return {"requestId": request.requestId, "decision": request.decision}


@app.get("/integrations/auth-providers/catalog")
def list_auth_provider_catalog(_: Principal = Depends(require_permissions("integration:read"))):
    return {"items": auth_provider_catalog()}


def _auth_config_to_model(record: AuthProviderConfigRecord) -> AuthProviderConfig:
    return AuthProviderConfig(
        id=record.id,
        tenantId=record.tenant_id,
        providerName=record.provider_name,
        protocol=record.protocol,
        metadata=record.metadata_json,
        claimMapping=record.claim_mapping,
        isPrimary=record.is_primary,
        isFallback=record.is_fallback,
        loginPolicy=record.login_policy,
        status=record.status,
    )


@app.post("/integrations/auth-providers", status_code=status.HTTP_201_CREATED)
def create_auth_provider_config(
    request: CreateAuthProviderConfigRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    tenant = db.query(TenantRecord).filter(TenantRecord.id == request.tenantId).one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    record = AuthProviderConfigRecord(
        tenant_id=request.tenantId,
        provider_name=request.providerName,
        protocol=request.protocol,
        metadata_json=request.metadata,
        claim_mapping=request.claimMapping,
        is_primary=request.isPrimary,
        is_fallback=request.isFallback,
        login_policy=request.loginPolicy,
        status="active",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _auth_config_to_model(record)


@app.get("/integrations/auth-providers")
def list_auth_provider_configs(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:read")),
):
    query = db.query(AuthProviderConfigRecord)
    if "platform_admin" not in principal.roles:
        if not principal.tenant_id:
            return {"items": []}
        query = query.filter(AuthProviderConfigRecord.tenant_id == principal.tenant_id)
    return {"items": [_auth_config_to_model(item) for item in query.all()]}


@app.patch("/integrations/auth-providers/{provider_config_id}")
def update_auth_provider_config(
    provider_config_id: UUID,
    request: UpdateAuthProviderConfigRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:write")),
):
    record = db.query(AuthProviderConfigRecord).filter(AuthProviderConfigRecord.id == provider_config_id).one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Auth provider config not found")
    enforce_tenant_scope(principal, record.tenant_id)
    payload = request.model_dump(exclude_none=True)
    if "metadata" in payload:
        record.metadata_json = payload["metadata"]
    if "claimMapping" in payload:
        record.claim_mapping = payload["claimMapping"]
    if "isPrimary" in payload:
        record.is_primary = payload["isPrimary"]
    if "isFallback" in payload:
        record.is_fallback = payload["isFallback"]
    if "loginPolicy" in payload:
        record.login_policy = payload["loginPolicy"]
    if "status" in payload:
        record.status = payload["status"]
    db.commit()
    db.refresh(record)
    return _auth_config_to_model(record)


@app.get("/integrations/sync/connectors/catalog")
def list_sync_connector_catalog(_: Principal = Depends(require_permissions("integration:read"))):
    return {"items": sync_connector_catalog()}


def _sync_config_to_model(record: SyncConnectorConfigRecord) -> SyncConnectorConfig:
    return SyncConnectorConfig(
        id=record.id,
        tenantId=record.tenant_id,
        sourceCategory=record.source_category,
        providerName=record.provider_name,
        syncMode=record.sync_mode,
        includeObjects=record.include_objects,
        filterPolicy=record.filter_policy,
        credentialReference=record.credential_reference,
        status=record.status,
    )


@app.post("/integrations/sync/connectors", status_code=status.HTTP_201_CREATED)
def create_sync_connector_config(
    request: CreateSyncConnectorConfigRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    tenant = db.query(TenantRecord).filter(TenantRecord.id == request.tenantId).one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    record = SyncConnectorConfigRecord(
        tenant_id=request.tenantId,
        source_category=request.sourceCategory,
        provider_name=request.providerName,
        sync_mode=request.syncMode,
        include_objects=request.includeObjects,
        filter_policy=request.filterPolicy,
        credential_reference=(
            request.credentialReference.model_dump(mode="json") if request.credentialReference else None
        ),
        status="active",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _sync_config_to_model(record)


@app.get("/integrations/sync/connectors")
def list_sync_connector_configs(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:read")),
):
    query = db.query(SyncConnectorConfigRecord)
    if "platform_admin" not in principal.roles:
        if not principal.tenant_id:
            return {"items": []}
        query = query.filter(SyncConnectorConfigRecord.tenant_id == principal.tenant_id)
    return {"items": [_sync_config_to_model(item) for item in query.all()]}


@app.post("/integrations/sync/jobs/run", status_code=status.HTTP_202_ACCEPTED)
def run_sync_job(
    request: RunSyncJobRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:write")),
):
    connector = db.query(SyncConnectorConfigRecord).filter(SyncConnectorConfigRecord.id == request.connectorId).one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Sync connector config not found")
    enforce_tenant_scope(principal, connector.tenant_id)
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
    db.add(
        SyncJobRecord(
            id=response.jobId,
            connector_id=request.connectorId,
            run_type=request.runType,
            status=response.status.value,
            stats=response.stats,
        )
    )
    db.commit()
    return response


@app.get("/integrations/sync/jobs/{job_id}")
def get_sync_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("integration:read")),
):
    job = db.query(SyncJobRecord).filter(SyncJobRecord.id == job_id).one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    connector = db.query(SyncConnectorConfigRecord).filter(SyncConnectorConfigRecord.id == job.connector_id).one_or_none()
    if connector:
        enforce_tenant_scope(principal, connector.tenant_id)
    return SyncJobResponse(
        jobId=job.id,
        connectorId=job.connector_id,
        runType=job.run_type,
        status=job.status,
        stats=job.stats,
    )


@app.get("/i18n/locales")
def list_supported_locales(_: Principal = Depends(require_permissions("application:read"))):
    return {"items": locales_catalog()}


@app.get("/i18n/translations/{namespace}")
def get_translation_bundle(
    namespace: str,
    locale: str,
    _: Principal = Depends(require_permissions("application:read")),
):
    namespace_bundles = TRANSLATIONS.get(namespace, {})
    payload = namespace_bundles.get(locale) or namespace_bundles.get("en-US") or {
        "namespace": namespace,
        "locale": locale,
        "version": 1,
        "messages": {},
    }
    return TranslationBundle(**payload)


@app.get("/users/me/accessibility-preferences")
def get_my_accessibility_preferences(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    key = str(principal.user_id)
    record = db.query(AccessibilityPreferenceRecord).filter(AccessibilityPreferenceRecord.user_key == key).one_or_none()
    if not record:
        return AccessibilityPreferences()
    return AccessibilityPreferences(
        keyboardOnlyMode=record.keyboard_only_mode,
        focusRingStyle=record.focus_ring_style,
        reducedMotion=record.reduced_motion,
        highContrastMode=record.high_contrast_mode,
        screenReaderOptimized=record.screen_reader_optimized,
    )


@app.put("/users/me/accessibility-preferences")
def update_my_accessibility_preferences(
    request: UpsertAccessibilityPreferencesRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
):
    key = str(principal.user_id)
    record = db.query(AccessibilityPreferenceRecord).filter(AccessibilityPreferenceRecord.user_key == key).one_or_none()
    if not record:
        record = AccessibilityPreferenceRecord(user_key=key)
        db.add(record)
    payload = request.model_dump(exclude_none=True)
    if "keyboardOnlyMode" in payload:
        record.keyboard_only_mode = payload["keyboardOnlyMode"]
    if "focusRingStyle" in payload:
        record.focus_ring_style = payload["focusRingStyle"]
    if "reducedMotion" in payload:
        record.reduced_motion = payload["reducedMotion"]
    if "highContrastMode" in payload:
        record.high_contrast_mode = payload["highContrastMode"]
    if "screenReaderOptimized" in payload:
        record.screen_reader_optimized = payload["screenReaderOptimized"]
    db.commit()
    db.refresh(record)
    return AccessibilityPreferences(
        keyboardOnlyMode=record.keyboard_only_mode,
        focusRingStyle=record.focus_ring_style,
        reducedMotion=record.reduced_motion,
        highContrastMode=record.high_contrast_mode,
        screenReaderOptimized=record.screen_reader_optimized,
    )


@app.get("/compliance/frameworks")
def list_compliance_frameworks(_: Principal = Depends(require_permissions("compliance:read"))):
    return {"items": frameworks_catalog()}


@app.post("/compliance/reports/run", status_code=status.HTTP_202_ACCEPTED)
def run_compliance_report(
    request: ComplianceReportRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("compliance:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    report = ComplianceReportResponse(framework=request.framework, status=RunStatus.queued)
    db.add(
        ComplianceReportRecord(
            id=report.reportId,
            tenant_id=request.tenantId,
            framework=request.framework,
            scope_json=request.scope,
            status=report.status.value,
        )
    )
    db.commit()
    return report


@app.get("/dashboards/me")
def get_my_dashboard(
    tenantId: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("dashboard:read")),
):
    scope_tenant = tenantId or principal.tenant_id
    if scope_tenant:
        enforce_tenant_scope(principal, scope_tenant)
    record = (
        db.query(DashboardConfigRecord)
        .filter(
            DashboardConfigRecord.user_id == principal.user_id,
            DashboardConfigRecord.tenant_id == scope_tenant,
        )
        .one_or_none()
    )
    if not record:
        return DashboardConfig(userId=principal.user_id, tenantId=scope_tenant, widgets=[])
    return to_dashboard_model(record)


@app.put("/dashboards/me")
def upsert_my_dashboard(
    request: UpsertDashboardConfigRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("dashboard:write")),
):
    if request.tenantId:
        enforce_tenant_scope(principal, request.tenantId)
    record = (
        db.query(DashboardConfigRecord)
        .filter(
            DashboardConfigRecord.user_id == principal.user_id,
            DashboardConfigRecord.tenant_id == request.tenantId,
        )
        .one_or_none()
    )
    if not record:
        record = DashboardConfigRecord(
            user_id=principal.user_id,
            tenant_id=request.tenantId,
        )
        db.add(record)
    record.name = request.name
    record.is_default = request.isDefault
    record.layout = request.layout
    record.widgets = request.widgets
    db.commit()
    db.refresh(record)
    return to_dashboard_model(record)


@app.get("/dashboards/analytics")
def get_dashboard_analytics(
    tenantId: UUID = Query(...),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("dashboard:read")),
):
    enforce_tenant_scope(principal, tenantId)
    total_apps = db.query(ApplicationRecord).filter(ApplicationRecord.tenant_id == tenantId).count()
    completed_apps = (
        db.query(ApplicationRecord)
        .filter(ApplicationRecord.tenant_id == tenantId, ApplicationRecord.status.in_(["onboarded", "completed"]))
        .count()
    )
    denials = (
        db.query(ProviderAccessRequestRecord)
        .filter(ProviderAccessRequestRecord.tenant_id == tenantId, ProviderAccessRequestRecord.status == "denied")
        .count()
    )
    execution_errors = (
        db.query(ExecutionRecord)
        .join(ApplicationRecord, ApplicationRecord.id == ExecutionRecord.application_id)
        .filter(ApplicationRecord.tenant_id == tenantId, ExecutionRecord.status == "failed")
        .count()
    )
    sync_errors = (
        db.query(SyncJobRecord)
        .join(SyncConnectorConfigRecord, SyncConnectorConfigRecord.id == SyncJobRecord.connector_id)
        .filter(SyncConnectorConfigRecord.tenant_id == tenantId, SyncJobRecord.status == "failed")
        .count()
    )
    errors = execution_errors + sync_errors

    focus_items: list[dict] = []
    if errors > 0:
        focus_items.append({"type": "errors", "priority": "high", "count": errors, "message": "Investigate failed jobs"})
    pending_consents = (
        db.query(ProviderAccessRequestRecord)
        .filter(ProviderAccessRequestRecord.tenant_id == tenantId, ProviderAccessRequestRecord.status == "pending")
        .count()
    )
    if pending_consents > 0:
        focus_items.append(
            {"type": "approvals", "priority": "medium", "count": pending_consents, "message": "Pending consent approvals"}
        )

    progress = 0.0 if total_apps == 0 else round((completed_apps / total_apps) * 100.0, 2)
    charts = [
        {"type": "donut", "title": "Onboarding Progress", "data": {"completed": completed_apps, "remaining": total_apps - completed_apps}},
        {"type": "bar", "title": "Operational Exceptions", "data": {"denials": denials, "errors": errors}},
    ]
    role = principal.roles[0] if principal.roles else "user"
    return DashboardAnalyticsResponse(
        tenantId=tenantId,
        role=role,
        progress=progress,
        completions=completed_apps,
        denials=denials,
        errors=errors,
        focusItems=focus_items,
        charts=charts,
    )


def _run_filter_report(db: Session, tenant_id: UUID, filters: dict, limit: int) -> list[dict]:
    query = db.query(ApplicationRecord).filter(ApplicationRecord.tenant_id == tenant_id)
    if "status" in filters:
        query = query.filter(ApplicationRecord.status == filters["status"])
    if "classification" in filters:
        query = query.filter(ApplicationRecord.data_classification == filters["classification"])
    rows = query.limit(limit).all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "status": row.status,
            "dataClassification": row.data_classification,
            "businessCriticality": row.business_criticality,
        }
        for row in rows
    ]


def _run_sql_report(db: Session, tenant_id: UUID, sql_query: str, limit: int) -> list[dict]:
    safe_sql = validate_safe_sql(sql_query)
    if "limit" not in safe_sql.lower():
        safe_sql = f"{safe_sql.rstrip()} LIMIT {limit}"
    result = db.execute(text(safe_sql)).mappings().all()
    scoped = []
    for row in result:
        row_data = dict(row)
        if "tenant_id" in row_data and str(row_data["tenant_id"]) != str(tenant_id):
            continue
        scoped.append({k: (str(v) if isinstance(v, UUID) else v) for k, v in row_data.items()})
    return scoped[:limit]


def _run_graphql_report(db: Session, tenant_id: UUID, graphql_query: str, limit: int) -> list[dict]:
    query_lower = graphql_query.lower()
    if "applications" in query_lower:
        return _run_filter_report(db, tenant_id, {}, limit)
    if "errors" in query_lower or "executions" in query_lower:
        rows = (
            db.query(ExecutionRecord)
            .join(ApplicationRecord, ApplicationRecord.id == ExecutionRecord.application_id)
            .filter(ApplicationRecord.tenant_id == tenant_id, ExecutionRecord.status == "failed")
            .limit(limit)
            .all()
        )
        return [{"executionId": str(row.id), "applicationId": str(row.application_id), "status": row.status} for row in rows]
    raise HTTPException(status_code=400, detail="Unsupported GraphQL report query shape")


def _run_ai_prompt_report(db: Session, tenant_id: UUID, ai_prompt: str, limit: int) -> tuple[list[dict], str]:
    prompt = ai_prompt.lower()
    if "error" in prompt or "focus" in prompt:
        data = _run_graphql_report(db, tenant_id, "query { errors }", limit)
        return data, "AI identified operational risk hotspots."
    if "completion" in prompt or "progress" in prompt:
        data = _run_filter_report(db, tenant_id, {}, limit)
        return data, "AI generated completion-focused onboarding summary."
    data = _run_filter_report(db, tenant_id, {}, limit)
    return data, "AI generated a general tenant onboarding report."


@app.post("/reports/generate")
def generate_report(
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("report:write")),
):
    enforce_tenant_scope(principal, request.tenantId)
    limit = safe_report_limit(request.limit)
    summary = "Report generated successfully."
    if request.mode == ReportMode.filters:
        data = _run_filter_report(db, request.tenantId, request.filters, limit)
    elif request.mode == ReportMode.sql:
        if not request.sqlQuery:
            raise HTTPException(status_code=400, detail="sqlQuery is required for SQL mode")
        data = _run_sql_report(db, request.tenantId, request.sqlQuery, limit)
    elif request.mode == ReportMode.graphql:
        if not request.graphqlQuery:
            raise HTTPException(status_code=400, detail="graphqlQuery is required for GraphQL mode")
        data = _run_graphql_report(db, request.tenantId, request.graphqlQuery, limit)
    elif request.mode == ReportMode.ai_prompt:
        if not request.aiPrompt:
            raise HTTPException(status_code=400, detail="aiPrompt is required for AI mode")
        data, summary = _run_ai_prompt_report(db, request.tenantId, request.aiPrompt, limit)
    else:
        raise HTTPException(status_code=400, detail="Unsupported report mode")

    visualizations = [
        {"type": "table", "title": request.title, "fields": list(data[0].keys()) if data else []},
        {"type": "bar", "title": "Records by Status", "xField": "status", "yField": "count"},
    ]
    report = ReportResult(
        tenantId=request.tenantId,
        title=request.title,
        mode=request.mode,
        summary=summary,
        data=data,
        visualizations=visualizations,
    )
    db.add(
        ReportRecord(
            id=report.id,
            tenant_id=request.tenantId,
            user_id=principal.user_id,
            title=request.title,
            mode=request.mode.value,
            request_payload=request.model_dump(mode="json"),
            summary=summary,
            data=data,
            visualizations=visualizations,
            status=report.status,
        )
    )
    db.commit()
    return report


@app.get("/reports")
def list_reports(
    tenantId: UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_permissions("report:read")),
):
    enforce_tenant_scope(principal, tenantId)
    rows = (
        db.query(ReportRecord)
        .filter(ReportRecord.tenant_id == tenantId)
        .order_by(ReportRecord.generated_at.desc())
        .limit(limit)
        .all()
    )
    return {"items": [to_report_model(row) for row in rows]}
