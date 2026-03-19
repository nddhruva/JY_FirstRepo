# 05. Integration Playbook (OOTB -> Custom -> Web Services)

## Goal

Standardize onboarding into IGA/PAM/IAM/SSO platforms using a deterministic strategy:

1. OOTB connector first
2. Custom connector second
3. Web services integration as fallback

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
