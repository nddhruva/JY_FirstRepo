from __future__ import annotations

from .models import AuthProviderCatalogEntry, ComplianceFramework, ConnectorDefinition, Domain, LocaleInfo


def auth_provider_catalog() -> list[AuthProviderCatalogEntry]:
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


def sync_connector_catalog() -> list[dict]:
    return [
        {
            "id": "workday",
            "sourceCategory": "hr",
            "providerName": "Workday",
            "supportedSyncModes": ["full", "delta", "scheduled"],
            "supportedObjects": ["users", "employment", "ownership"],
            "status": "active",
        },
        {
            "id": "successfactors",
            "sourceCategory": "hr",
            "providerName": "SAP SuccessFactors",
            "supportedSyncModes": ["full", "delta", "scheduled"],
            "supportedObjects": ["users", "employment"],
            "status": "active",
        },
        {
            "id": "entra-directory",
            "sourceCategory": "iam",
            "providerName": "Microsoft Entra ID",
            "supportedSyncModes": ["full", "delta", "event"],
            "supportedObjects": ["users", "groups", "applications", "ownership"],
            "status": "active",
        },
        {
            "id": "okta-directory",
            "sourceCategory": "iam",
            "providerName": "Okta",
            "supportedSyncModes": ["full", "delta", "event"],
            "supportedObjects": ["users", "groups", "applications", "ownership"],
            "status": "active",
        },
    ]


def connector_catalog() -> list[ConnectorDefinition]:
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


def locales_catalog() -> list[LocaleInfo]:
    return [
        LocaleInfo(locale="en-US", language="English", direction="ltr", status="active"),
        LocaleInfo(locale="fr-FR", language="French", direction="ltr", status="active"),
        LocaleInfo(locale="de-DE", language="German", direction="ltr", status="active"),
        LocaleInfo(locale="ar-SA", language="Arabic", direction="rtl", status="beta"),
    ]


def frameworks_catalog() -> list[ComplianceFramework]:
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


TRANSLATIONS: dict[str, dict[str, dict]] = {
    "common": {
        "en-US": {
            "namespace": "common",
            "locale": "en-US",
            "version": 1,
            "messages": {
                "app.title": "Application Onboarding Platform",
                "task.submit": "Submit",
                "task.approve": "Approve",
            },
        },
        "fr-FR": {
            "namespace": "common",
            "locale": "fr-FR",
            "version": 1,
            "messages": {
                "app.title": "Plateforme d'Integration d'Applications",
                "task.submit": "Soumettre",
                "task.approve": "Approuver",
            },
        },
    }
}
