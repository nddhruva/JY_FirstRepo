# 05. Integration Playbook (OOTB -> Custom -> Web Services)

## Goal

Standardize onboarding into IGA/PAM/IAM/SSO platforms using a deterministic strategy:

1. OOTB connector first
2. Custom connector second
3. Web services integration as fallback

Also standardize:
- enterprise user authentication integrations (IAM/CIAM/SSO/Federation),
- source sync for users and application metadata from HR/IAM products,
- multi-instance onboarding under one parent application.

---

## Pre-Checks for Any Target Vendor Product

1. Collect target details:
   - vendor name
   - product name + version
   - tenant/environment endpoint
   - supported auth methods
   - secret integration capability

2. Validate application schema:
   - identity attributes
   - account lifecycle operations
   - group/role entitlement model
   - reconciliation/export capabilities

3. Evaluate policy constraints:
   - data residency
   - approval requirements
   - compliance controls

4. Validate source/sync prerequisites (if needed):
   - authoritative source type (HR/IAM)
   - supported sync mode (full/delta/event)
   - filtering constraints and ownership mapping

---

## Connector Selection Algorithm

```text
if exact OOTB connector exists and supported:
    choose OOTB connector
elif compatible OOTB connector exists:
    choose OOTB with mapped extensions
elif schema has sufficient CRUD + entitlement semantics:
    generate custom connector scaffold
else:
    generate web services application profile
```

---

## OOTB Connector Onboarding Flow

1. Pull connector package from catalog
2. Map source app schema to vendor connector schema
3. Bind credentials via external secret reference
4. Run capability test suite (create/update/disable/reconcile)
5. Promote to target environment with approvals

---

## Authentication Provider Integration Flow

1. Select enterprise IdP from integration catalog.
2. Configure protocol (OIDC/SAML/OAuth2) and trust metadata.
3. Configure claim/group mapping to internal roles.
4. Enable tenant auth routing and optional fallback provider.
5. Run login and authorization conformance tests.

---

## HR and IAM Source Sync Flow

1. Register source connector (HR or IAM directory).
2. Configure scope filters (OU/department/region/employment status).
3. Configure sync mode and frequency.
4. Execute dry-run and review data delta.
5. Approve and activate sync schedule.
6. Monitor job outcomes and conflict resolution logs.

---

## Custom Connector Build Flow

1. Generate scaffold:
   - config schema
   - transport adapter (REST/SOAP/SCIM/JDBC/etc.)
   - operation templates
2. Implement operations:
   - create account
   - update attributes
   - disable/enable
   - reconcile and entitlement fetch
3. Run contract tests + sandbox certification
4. Register connector in catalog with semantic version

---

## Web Services Fallback Flow

Use this only when:
- no OOTB connector exists,
- custom connector is not feasible in required timeframe,
- target vendor supports generic web services integration model.

Steps:
1. Build web services application definition from schema
2. Configure endpoint/auth/signing
3. Map required operations and response parsers
4. Apply reliability controls (retry/backoff/dead-letter)
5. Record known functional limits and remediation plan

---

## Secrets Management Integration

Supported secret managers:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- GCP Secret Manager

Rules:
- Never persist raw credentials in onboarding records.
- Persist only references (`secret://provider/path`).
- Rotate secrets based on policy and validate connectivity after rotation.

---

## Logging and Audit Integration

- Send connector execution events to SIEM (e.g., Splunk HEC)
- Include correlation ID across workflow + integration jobs
- Preserve request/response hashes for non-repudiation
- Mask sensitive fields before export/log forwarding

---

## Migration-Ready Design Pattern

To move from one vendor product to another:
1. Keep source-of-truth data in AOP canonical schema.
2. Add new vendor integration point as target profile.
3. Re-run connector strategy using existing app metadata and questionnaire answers.
4. Execute onboarding with minimal data recollection.

---

## Multi-Instance Application Onboarding Pattern

Use one parent application with many managed instances:
- DEV
- QA/UAT
- STAGE
- PROD

For each instance:
1. Define endpoint and auth method.
2. Bind instance-level secret reference.
3. Attach instance-specific connector mapping.
4. Execute onboarding and validation independently.

Use promotion workflow controls to move from non-prod readiness to prod onboarding.
