# 08. Identity Authentication and Sync Integrations

## Objective

Provide enterprise authentication and source-sync integrations so adoption depends on each client's existing IAM/CIAM/SSO/Federation and HR ecosystem.

This document defines:
- IdP authentication integration coverage
- HR/IAM source synchronization for users and application metadata
- Multiple instances of same application under one umbrella application record

---

## 1) Authentication Integration Model

### Supported Protocols
- OIDC
- OAuth 2.0
- SAML 2.0
- WS-Federation (where required through adapter)
- SCIM 2.0 (provisioning and deprovisioning)
- LDAP/AD bridge (through connector where needed)

### Known Industry IAM/CIAM/SSO/Federation Products (Catalog Baseline)

The connector catalog should include and continuously maintain integrations for major products, including but not limited to:

- Microsoft Entra ID (Azure AD)
- Okta Workforce Identity Cloud
- Auth0
- Ping Identity (PingFederate, PingOne)
- ForgeRock / PingAM
- Keycloak / Red Hat SSO
- Google Cloud Identity / Google Workspace
- AWS IAM Identity Center
- OneLogin
- IBM Security Verify
- Oracle Identity Cloud Service
- Salesforce Identity
- CyberArk Identity
- Duo SSO
- ADFS
- Shibboleth

Implementation policy:
1. Use OOTB authentication connector if available.
2. Use protocol-compatible configuration adapter if exact connector is absent.
3. Build custom auth connector only when required by non-standard flows.

---

## 2) Source Synchronization Model (Users + Apps Metadata)

### Supported Source Categories
- HR systems (authoritative user lifecycle source)
- IAM/CIAM/SSO/Federation directories
- Identity governance systems
- App inventory CMDB/data lake sources

### Known HR Products (Catalog Baseline)
- Workday
- SAP SuccessFactors
- Oracle HCM Cloud
- ADP
- UKG
- Ceridian Dayforce
- BambooHR
- HiBob

### Known IAM/Directory Sources (Catalog Baseline)
- Microsoft Entra ID / Active Directory
- Okta / Auth0
- Ping Identity
- Google Cloud Identity
- AWS IAM Identity Center
- IBM Security Verify
- OneLogin
- ForgeRock / Keycloak

### Sync Data Types
- Users and identities
- Group and role membership
- Application registry and metadata
- Ownership mappings (application owner, business owner)
- Employment state changes (joiner/mover/leaver)

### Sync Modes
- Full sync
- Incremental delta sync
- Event-driven sync (webhooks/queue)
- Scheduled batch sync

### Filtering and Scoping
- Include/exclude by OU, department, region, employment type
- Include/exclude by application criticality, environment, status
- Attribute-based filters with preview and dry-run support

---

## 3) Multi-Instance Application Model

The platform supports a parent application with multiple child instances, for example:
- DEV
- QA/UAT
- STAGE
- PROD

### Instance-Level Capabilities
- Separate endpoint/configuration per instance
- Separate secrets references per instance
- Separate connector mappings per instance
- Separate workflow gates by environment risk
- Separate onboarding execution history and health metrics

### Parent-Level Capabilities
- Shared canonical application metadata
- Shared questionnaire baseline with environment-specific deltas
- Roll-up dashboards across all instances
- Promotion workflows from non-prod to prod

---

## 4) Operational Rules

1. Authentication integrations are tenant-scoped and can be configured as primary or fallback.
2. Sync connectors can be one-to-many per tenant and mapped to scoped targets.
3. Conflicts in inbound data follow deterministic precedence rules.
4. Sensitive attributes from sources are masked/tokenized based on policy.
5. Every sync and auth configuration change is fully audited.

---

## 5) API-First Capabilities (Implemented in Contract)

- Auth provider catalog and configuration APIs
- Source sync connector catalog and configuration APIs
- Sync job execution and status APIs
- Application instance CRUD APIs under parent application

See `docs/03-api-first-openapi.yaml` for endpoint and schema details.
