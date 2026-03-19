# API Guide

## Overview

The AOP API is the primary integration surface for onboarding applications into IGA/IAM/PAM/SSO target systems.

- Contract source: `docs/03-api-first-openapi.yaml`
- Style: REST over HTTPS + JSON
- Auth: OAuth2/OIDC bearer JWT
- Scope: all UI capabilities are API-backed

---

## 1) Authentication and Authorization

### Authentication
- Obtain access token from tenant identity provider.
- For bootstrap/development environments, obtain token from `POST /auth/token`.
- Pass token in header:

```http
Authorization: Bearer <access_token>
```

### Authorization
- Permissions are role-based with attribute policies.
- Access is constrained by tenant, role, and data scope.

---

## 2) Localization and Regional Headers

Recommended headers:

```http
Accept-Language: en-US
```

Behavior:
- API uses locale preferences for user-facing messages and localized payload fields where applicable.
- Fallback locale policy applies when requested locale is unavailable.

---

## 3) Core API Flows

### Create Tenant
`POST /tenants`

### Register Application
`POST /applications`

### Ingest Metadata
`POST /applications/{applicationId}/ingest`

### Assign Questionnaires
`POST /applications/{applicationId}/questionnaires/assign`

### Generate Onboarding Plan
`POST /applications/{applicationId}/onboarding/plan`

### Execute Onboarding
`POST /applications/{applicationId}/onboarding/execute`

---

## 4) Connector APIs

### Search OOTB Catalog
`POST /connectors/catalog/search`

### Build Custom Scaffold
`POST /connectors/custom/scaffold`

Use recommended flow:
1. catalog search
2. choose OOTB if available
3. scaffold custom if unavailable
4. use web services profile as fallback

---

## 5) Identity Authentication Integration APIs

### Auth Provider Catalog
`GET /integrations/auth-providers/catalog`

### Configure Tenant Auth Provider
`POST /integrations/auth-providers`

### List Tenant Auth Providers
`GET /integrations/auth-providers`

### Update Auth Provider
`PATCH /integrations/auth-providers/{providerConfigId}`

Use these APIs to integrate tenant authentication with enterprise IAM/CIAM/SSO/Federation products.

---

## 6) Source Sync APIs (HR + IAM + App Metadata)

### Source Connector Catalog
`GET /integrations/sync/connectors/catalog`

### Configure Source Sync Connector
`POST /integrations/sync/connectors`

### List Configured Sync Connectors
`GET /integrations/sync/connectors`

### Run Sync Job
`POST /integrations/sync/jobs/run`

### Get Sync Job Status
`GET /integrations/sync/jobs/{jobId}`

These APIs support importing filtered or full users, group membership, and application metadata from connected sources.

---

## 7) Application Instance APIs

### Create Instance Under Parent Application
`POST /applications/{applicationId}/instances`

### List Instances
`GET /applications/{applicationId}/instances`

### Update Instance
`PATCH /applications/{applicationId}/instances/{instanceId}`

Use instances to model non-prod and prod under one parent application.

---

## 8) Branding APIs

### Get Tenant Branding
`GET /tenants/{tenantId}/branding`

### Upsert Tenant Branding
`PUT /tenants/{tenantId}/branding`

### Upload Branding Asset (logo/fonts/background/palette/etc.)
`POST /tenants/{tenantId}/branding/assets`

---

## 9) Dashboard APIs

### Get My Dashboard
`GET /dashboards/me`

### Upsert My Dashboard
`PUT /dashboards/me`

### Get Role-Aware Dashboard Analytics
`GET /dashboards/analytics?tenantId=<tenantId>`

---

## 10) Reporting APIs

### Generate Report
`POST /reports/generate`

Supported report modes:
- `filters`
- `sql` (safe read-only subset)
- `graphql` (supported query shapes)
- `ai_prompt` (GenAI-style prompt-driven)

### List Reports
`GET /reports?tenantId=<tenantId>`

---

## 11) Localization APIs

### List Supported Locales
`GET /i18n/locales`

### Get Translation Bundle
`GET /i18n/translations/{namespace}?locale=<locale>`

Use cases:
- loading locale packs for web/mobile clients
- syncing translation keys for questionnaire and workflow UIs

---

## 12) Accessibility APIs

### Get User Accessibility Preferences
`GET /users/me/accessibility-preferences`

### Update User Accessibility Preferences
`PUT /users/me/accessibility-preferences`

Typical fields:
- `keyboardOnlyMode`
- `focusRingStyle`
- `reducedMotion`
- `highContrastMode`
- `screenReaderOptimized`

---

## 13) Compliance APIs

### List Frameworks
`GET /compliance/frameworks`

### Run Compliance Report
`POST /compliance/reports/run`

Use these APIs to automate audit pack generation for enabled frameworks.

---

## 14) Consent APIs

### Request Access
`POST /consent/provider-access`

### Approve/Deny/Revoke
`PUT /consent/provider-access`

All provider-side data access is:
- explicit consent-based
- scope-limited
- time-bounded
- fully audited

---

## 15) Error Model and Retries

Use consistent error handling:
- `400` validation failure
- `401/403` auth/authz failure
- `404` resource not found
- `409` state conflict
- `422` policy/compliance rule violation
- `429` throttling
- `5xx` server/platform failures

Retry guidance:
- Use exponential backoff for `429` and transient `5xx`.
- Do not retry non-idempotent operations unless idempotency key support is configured.

---

## 16) Versioning and Compatibility

- API version is path-based (`/v1`).
- Backward-compatible changes:
  - additive fields
  - additive endpoints
- Breaking changes require major API version increment.

---

## 17) Example Onboarding Sequence

---

1. `POST /applications`
2. `POST /applications/{applicationId}/instances`
3. `POST /integrations/auth-providers`
4. `POST /integrations/sync/connectors`
5. `POST /integrations/sync/jobs/run`
6. `POST /applications/{applicationId}/ingest`
7. `POST /applications/{applicationId}/questionnaires/assign`
8. `POST /applications/{applicationId}/onboarding/plan`
9. `POST /applications/{applicationId}/onboarding/execute`
10. `POST /exports/configuration`

This sequence allows full API-based onboarding with no mandatory UI usage.
