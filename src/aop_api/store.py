from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from .models import (
    AccessibilityPreferences,
    Application,
    AuthProviderCatalogEntry,
    ComplianceFramework,
    ConnectorDefinition,
    Domain,
    LocaleInfo,
    ProviderAccessRequest,
    QuestionnaireTemplate,
    RunStatus,
    SyncConnectorCatalogEntry,
    SyncJobResponse,
    Tenant,
    TranslationBundle,
    WorkflowTemplate,
)


def _auth_catalog() -> list[AuthProviderCatalogEntry]:
    return [
        AuthProviderCatalogEntry(
            id="entra-id",
            providerName="Microsoft Entra ID",
            providerCategory="iam",
            supportedProtocols=["OIDC", "SAML", "SCIM"],
            status="active",
        ),
        AuthProviderCatalogEntry(
            id="okta",
            providerName="Okta Workforce Identity Cloud",
            providerCategory="iam",
            supportedProtocols=["OIDC", "SAML", "SCIM"],
            status="active",
        ),
        AuthProviderCatalogEntry(
            id="auth0",
            providerName="Auth0",
            providerCategory="ciam",
            supportedProtocols=["OIDC", "OAUTH2", "SAML"],
            status="active",
        ),
        AuthProviderCatalogEntry(
            id="ping",
            providerName="Ping Identity",
            providerCategory="federation",
            supportedProtocols=["OIDC", "SAML", "WS_FED"],
            status="active",
        ),
        AuthProviderCatalogEntry(
            id="keycloak",
            providerName="Keycloak",
            providerCategory="iam",
            supportedProtocols=["OIDC", "SAML"],
            status="active",
        ),
    ]


def _sync_catalog() -> list[SyncConnectorCatalogEntry]:
    return [
        SyncConnectorCatalogEntry(
            id="workday",
            sourceCategory="hr",
            providerName="Workday",
            supportedSyncModes=["full", "delta", "scheduled"],
            supportedObjects=["users", "employment", "ownership"],
            status="active",
        ),
        SyncConnectorCatalogEntry(
            id="successfactors",
            sourceCategory="hr",
            providerName="SAP SuccessFactors",
            supportedSyncModes=["full", "delta", "scheduled"],
            supportedObjects=["users", "employment"],
            status="active",
        ),
        SyncConnectorCatalogEntry(
            id="entra-directory",
            sourceCategory="iam",
            providerName="Microsoft Entra ID",
            supportedSyncModes=["full", "delta", "event"],
            supportedObjects=["users", "groups", "applications", "ownership"],
            status="active",
        ),
        SyncConnectorCatalogEntry(
            id="okta-directory",
            sourceCategory="iam",
            providerName="Okta",
            supportedSyncModes=["full", "delta", "event"],
            supportedObjects=["users", "groups", "applications", "ownership"],
            status="active",
        ),
    ]


def _connector_catalog() -> list[ConnectorDefinition]:
    return [
        ConnectorDefinition(
            domain=Domain.IGA,
            vendor="SailPoint",
            product="IdentityIQ",
            type="ootb",
            operations=["create", "update", "disable", "reconcile"],
        ),
        ConnectorDefinition(
            domain=Domain.IAM,
            vendor="Microsoft",
            product="Entra ID",
            type="ootb",
            operations=["create", "update", "disable", "reconcile"],
        ),
        ConnectorDefinition(
            domain=Domain.SSO,
            vendor="Okta",
            product="Workforce Identity Cloud",
            type="ootb",
            operations=["sso", "provision", "deprovision"],
        ),
        ConnectorDefinition(
            domain=Domain.PAM,
            vendor="CyberArk",
            product="PAM",
            type="ootb",
            operations=["vault", "rotate", "checkout"],
        ),
    ]


def _locales() -> list[LocaleInfo]:
    return [
        LocaleInfo(locale="en-US", language="English", direction="ltr", status="active"),
        LocaleInfo(locale="fr-FR", language="French", direction="ltr", status="active"),
        LocaleInfo(locale="de-DE", language="German", direction="ltr", status="active"),
        LocaleInfo(locale="ar-SA", language="Arabic", direction="rtl", status="beta"),
    ]


def _frameworks() -> list[ComplianceFramework]:
    return [
        ComplianceFramework(name="SOC1", version="latest"),
        ComplianceFramework(name="SOC2", version="latest"),
        ComplianceFramework(name="GDPR", version="2016/679"),
        ComplianceFramework(name="HIPAA", version="latest"),
        ComplianceFramework(name="SOX", version="latest"),
        ComplianceFramework(name="PCI_DSS", version="4.0"),
        ComplianceFramework(name="CCPA_CPRA", version="latest"),
        ComplianceFramework(name="ISO_27001", version="2022"),
        ComplianceFramework(name="ISO_27701", version="2019"),
        ComplianceFramework(name="ISO_22301", version="2019"),
    ]


@dataclass
class InMemoryStore:
    tenants: dict[UUID, Tenant] = field(default_factory=dict)
    applications: dict[UUID, Application] = field(default_factory=dict)
    questionnaire_templates: dict[UUID, QuestionnaireTemplate] = field(default_factory=dict)
    workflow_templates: dict[UUID, WorkflowTemplate] = field(default_factory=dict)
    provider_access_requests: dict[UUID, ProviderAccessRequest] = field(default_factory=dict)
    auth_provider_configs: dict[UUID, dict] = field(default_factory=dict)
    sync_connector_configs: dict[UUID, dict] = field(default_factory=dict)
    sync_jobs: dict[UUID, SyncJobResponse] = field(default_factory=dict)
    executions: dict[UUID, dict] = field(default_factory=dict)
    compliance_reports: dict[UUID, dict] = field(default_factory=dict)
    accessibility_preferences: dict[str, AccessibilityPreferences] = field(default_factory=dict)
    ingests: list[dict] = field(default_factory=list)
    assignments: list[dict] = field(default_factory=list)
    exports: list[dict] = field(default_factory=list)

    connector_catalog: list[ConnectorDefinition] = field(default_factory=_connector_catalog)
    auth_provider_catalog: list[AuthProviderCatalogEntry] = field(default_factory=_auth_catalog)
    sync_connector_catalog: list[SyncConnectorCatalogEntry] = field(default_factory=_sync_catalog)
    locales: list[LocaleInfo] = field(default_factory=_locales)
    compliance_frameworks: list[ComplianceFramework] = field(default_factory=_frameworks)

    translations: dict[str, dict[str, TranslationBundle]] = field(
        default_factory=lambda: {
            "common": {
                "en-US": TranslationBundle(
                    namespace="common",
                    locale="en-US",
                    version=1,
                    messages={
                        "app.title": "Application Onboarding Platform",
                        "task.submit": "Submit",
                        "task.approve": "Approve",
                    },
                ),
                "fr-FR": TranslationBundle(
                    namespace="common",
                    locale="fr-FR",
                    version=1,
                    messages={
                        "app.title": "Plateforme d'Integration d'Applications",
                        "task.submit": "Soumettre",
                        "task.approve": "Approuver",
                    },
                ),
            }
        }
    )

    def get_translation(self, namespace: str, locale: str) -> TranslationBundle:
        namespace_bundles = self.translations.get(namespace, {})
        if locale in namespace_bundles:
            return namespace_bundles[locale]
        if "en-US" in namespace_bundles:
            return namespace_bundles["en-US"]
        return TranslationBundle(namespace=namespace, locale=locale, version=1, messages={})

    @staticmethod
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


store = InMemoryStore()

