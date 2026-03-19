from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


def new_uuid() -> UUID:
    return uuid4()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class IsolationTier(str, Enum):
    shared = "shared"
    dedicated = "dedicated"


class EnvironmentType(str, Enum):
    dev = "dev"
    test = "test"
    uat = "uat"
    stage = "stage"
    prod = "prod"
    other = "other"


class SecretProvider(str, Enum):
    vault = "vault"
    aws_sm = "aws_sm"
    azure_kv = "azure_kv"
    gcp_sm = "gcp_sm"


class Domain(str, Enum):
    IGA = "IGA"
    IAM = "IAM"
    PAM = "PAM"
    SSO = "SSO"


class ConnectorType(str, Enum):
    ootb = "ootb"
    custom = "custom"
    webservices = "webservices"


class RunStatus(str, Enum):
    queued = "queued"
    running = "running"
    completed = "completed"
    failed = "failed"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class SecretReference(BaseModel):
    provider: SecretProvider
    path: str


class Tenant(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    name: str
    region: str
    isolationTier: IsolationTier
    defaultLocale: str
    supportedLocales: list[str] = Field(default_factory=list)


class CreateTenantRequest(BaseModel):
    name: str
    region: str
    isolationTier: IsolationTier
    defaultLocale: str = "en-US"
    supportedLocales: list[str] = Field(default_factory=lambda: ["en-US"])


class TargetVendor(BaseModel):
    domain: Domain
    vendor: str
    product: str


class ApplicationInstance(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    applicationId: UUID
    instanceName: str
    environmentType: EnvironmentType
    endpoint: str | None = None
    region: str | None = None
    connectorProfileId: UUID | None = None
    secretReference: SecretReference | None = None
    status: str = "draft"


class CreateApplicationInstanceRequest(BaseModel):
    instanceName: str
    environmentType: EnvironmentType
    endpoint: str | None = None
    region: str | None = None
    connectorProfileId: UUID | None = None
    secretReference: SecretReference | None = None


class UpdateApplicationInstanceRequest(BaseModel):
    instanceName: str | None = None
    environmentType: EnvironmentType | None = None
    endpoint: str | None = None
    region: str | None = None
    connectorProfileId: UUID | None = None
    secretReference: SecretReference | None = None


class Application(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    tenantId: UUID
    name: str
    businessCriticality: str
    dataClassification: str
    status: str = "draft"
    targetVendors: list[TargetVendor] = Field(default_factory=list)
    instances: list[ApplicationInstance] = Field(default_factory=list)


class CreateApplicationRequest(BaseModel):
    tenantId: UUID
    name: str
    businessCriticality: str
    dataClassification: str
    targetVendors: list[TargetVendor] = Field(default_factory=list)
    instances: list[CreateApplicationInstanceRequest] = Field(default_factory=list)


class IngestRequest(BaseModel):
    sourceType: str
    payload: dict[str, Any]


class AssignStakeholder(BaseModel):
    role: str
    userId: UUID


class AssignQuestionnaireRequest(BaseModel):
    templateIds: list[UUID]
    stakeholders: list[AssignStakeholder]


class QuestionnaireAssignment(BaseModel):
    questionnaireInstanceId: UUID = Field(default_factory=new_uuid)
    assignedToUserId: UUID
    dueDate: datetime = Field(default_factory=utcnow)


class QuestionnaireAssignmentResult(BaseModel):
    applicationId: UUID
    assignments: list[QuestionnaireAssignment]


class QuestionnaireTemplate(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    version: int = 1
    name: str
    sections: list[dict[str, Any]] = Field(default_factory=list)


class WorkflowTemplate(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    version: int = 1
    name: str
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    transitions: list[dict[str, Any]] = Field(default_factory=list)


class ConnectorSearchRequest(BaseModel):
    domain: Domain
    vendor: str
    product: str
    productVersion: str | None = None


class ConnectorDefinition(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    domain: Domain
    vendor: str
    product: str
    type: ConnectorType
    operations: list[str] = Field(default_factory=list)
    status: str = "active"


class CustomConnectorScaffoldRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    applicationId: UUID
    targetVendorDomain: Domain
    schemaData: dict[str, Any] = Field(alias="schema")


class OnboardingPlan(BaseModel):
    applicationId: UUID
    connectorRecommendation: dict[str, Any]
    riskScore: dict[str, Any]


class ExecuteOnboardingRequest(BaseModel):
    targetVendorDomain: Domain
    vendor: str
    product: str
    connectorId: UUID | None = None
    secretReferences: list[SecretReference] = Field(default_factory=list)


class ExecutionResponse(BaseModel):
    executionId: UUID = Field(default_factory=new_uuid)
    status: RunStatus = RunStatus.queued


class ExportDestination(BaseModel):
    type: str
    url: str
    branch: str | None = None


class ExportRequest(BaseModel):
    tenantId: UUID
    applicationIds: list[UUID] = Field(default_factory=list)
    destination: ExportDestination
    includeEnvironments: bool = True


class ProviderAccessRequest(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    tenantId: UUID
    requestedBy: UUID | None = None
    purpose: str
    allowedDataScope: list[str]
    expiresAt: datetime
    status: str = "pending"


class ProviderAccessDecision(BaseModel):
    requestId: UUID
    decision: str
    decidedBy: UUID
    reason: str | None = None


class LocaleInfo(BaseModel):
    locale: str
    language: str
    direction: str
    status: str


class TranslationBundle(BaseModel):
    namespace: str
    locale: str
    version: int
    messages: dict[str, str]


class AccessibilityPreferences(BaseModel):
    keyboardOnlyMode: bool = True
    focusRingStyle: str = "default"
    reducedMotion: bool = False
    highContrastMode: bool = False
    screenReaderOptimized: bool = False


class UpsertAccessibilityPreferencesRequest(BaseModel):
    keyboardOnlyMode: bool | None = None
    focusRingStyle: str | None = None
    reducedMotion: bool | None = None
    highContrastMode: bool | None = None
    screenReaderOptimized: bool | None = None


class ComplianceFramework(BaseModel):
    name: str
    version: str


class ComplianceReportRequest(BaseModel):
    tenantId: UUID
    framework: str
    scope: dict[str, Any] = Field(default_factory=dict)


class ComplianceReportResponse(BaseModel):
    reportId: UUID = Field(default_factory=new_uuid)
    status: RunStatus = RunStatus.queued
    framework: str


class AuthProviderCatalogEntry(BaseModel):
    id: str
    providerName: str
    providerCategory: str
    supportedProtocols: list[str]
    status: str


class AuthProviderConfig(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    tenantId: UUID
    providerName: str
    protocol: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    claimMapping: dict[str, Any] = Field(default_factory=dict)
    isPrimary: bool = False
    isFallback: bool = False
    loginPolicy: str = "always"
    status: str = "active"


class CreateAuthProviderConfigRequest(BaseModel):
    tenantId: UUID
    providerName: str
    protocol: str
    metadata: dict[str, Any]
    claimMapping: dict[str, Any] = Field(default_factory=dict)
    isPrimary: bool = False
    isFallback: bool = False
    loginPolicy: str = "always"


class UpdateAuthProviderConfigRequest(BaseModel):
    metadata: dict[str, Any] | None = None
    claimMapping: dict[str, Any] | None = None
    isPrimary: bool | None = None
    isFallback: bool | None = None
    loginPolicy: str | None = None
    status: str | None = None


class SyncConnectorCatalogEntry(BaseModel):
    id: str
    sourceCategory: str
    providerName: str
    supportedSyncModes: list[str]
    supportedObjects: list[str]
    status: str


class SyncConnectorConfig(BaseModel):
    id: UUID = Field(default_factory=new_uuid)
    tenantId: UUID
    sourceCategory: str
    providerName: str
    syncMode: str
    includeObjects: list[str]
    filterPolicy: dict[str, Any] = Field(default_factory=dict)
    credentialReference: SecretReference | None = None
    status: str = "active"


class CreateSyncConnectorConfigRequest(BaseModel):
    tenantId: UUID
    sourceCategory: str
    providerName: str
    syncMode: str
    includeObjects: list[str]
    filterPolicy: dict[str, Any] = Field(default_factory=dict)
    credentialReference: SecretReference | None = None


class RunSyncJobRequest(BaseModel):
    connectorId: UUID
    runType: str
    dryRun: bool = False


class SyncJobResponse(BaseModel):
    jobId: UUID = Field(default_factory=new_uuid)
    connectorId: UUID
    runType: str
    status: RunStatus = RunStatus.queued
    stats: dict[str, int] = Field(
        default_factory=lambda: {"usersProcessed": 0, "applicationsProcessed": 0, "errors": 0}
    )


class AuthTokenRequest(BaseModel):
    username: str
    password: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
