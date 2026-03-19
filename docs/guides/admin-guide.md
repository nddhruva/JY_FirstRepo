# Admin Guide

## Purpose

This guide helps Tenant Admins and Platform Admins configure, operate, and govern the Application Onboarding Platform (AOP).

---

## 1) Admin Roles and Responsibilities

### Tenant Admin
- Manage tenant settings (locales, branding, retention, policy).
- Configure user access, role bindings, and delegated administration.
- Publish questionnaire templates and workflow templates.
- Manage integrations, exports, and consent decisions.

### Platform Admin (Provider Internal)
- Operate global control-plane features.
- Maintain connector catalog and policy baselines.
- Manage compliance control library and framework mappings.
- Access tenant non-sensitive information only via approved consent workflow.

---

## 2) Tenant Setup Checklist

1. Configure SSO (OIDC/SAML) and optional SCIM provisioning.
2. Set tenant default locale and supported locales.
3. Configure roles, permission policies, and segregation-of-duties constraints.
4. Configure secrets provider integrations (Vault/AWS/Azure/GCP).
5. Enable SIEM forwarding (Splunk/other).
6. Publish onboarding workflow and questionnaire templates.
7. Enable compliance frameworks relevant to tenant obligations.
8. Configure exports to Git/repository destinations.

---

## 3) Localization (i18n/l10n) Administration

### Locale Configuration
- Set **default locale** (for example, `en-US`).
- Add allowed user locales (for example, `en-US`, `fr-FR`, `de-DE`, `ar-SA`).
- Define fallback order for unsupported translations.

### Translation Management
- Manage translation namespaces:
  - `common`
  - `questionnaire`
  - `workflow`
  - `notifications`
- Publish versioned translation bundles.
- Validate translation completeness before activation.

### Content Localization
- Localize:
  - questionnaire labels/help text,
  - workflow notifications/emails,
  - validation and error messages.
- Keep canonical policy values language-neutral.

---

## 4) Keyboard-Only and Accessibility Administration

### Accessibility Baseline
- Enforce WCAG 2.2 AA baseline.
- Require keyboard-only operability for all high-priority user flows.
- Enable high-contrast and reduced-motion themes.

### Quality Gates
- Block release if:
  - focus order is broken,
  - non-mouse path does not exist,
  - screen-reader labels are missing,
  - critical shortcuts are non-functional.

### Accessibility Preferences
- Allow user-level preferences:
  - keyboard-only mode
  - focus ring style
  - reduced motion
  - high contrast

---

## 5) Workflow and Questionnaire Operations

### Workflow Template Lifecycle
- Draft -> Review -> Approved -> Active -> Deprecated
- Version templates; do not mutate active versions in place.
- Simulate workflow paths before publishing.

### Escalation and Delegation
- Define SLA thresholds by workflow stage.
- Configure escalation targets by role hierarchy.
- Allow temporary delegation with start/end validity windows.

### Questionnaire Governance
- Assign by role and risk profile.
- Add required evidence controls per question.
- Apply conditional logic for compliance-sensitive scenarios.

---

## 6) Connector and Integration Administration

1. Search OOTB catalog by vendor/product/version.
2. Configure mapped connector templates.
3. If no OOTB fit, initiate custom connector scaffold.
4. If custom not feasible, configure web services fallback profile.
5. Approve connector promotion only after test certification.

---

## 7) Secrets Administration

- Register external secret provider.
- Store references only (`secret://provider/path`) in platform records.
- Configure secret rotation cadence.
- Validate downstream vendor connectivity after secret rotation events.

---

## 8) Compliance Administration

### Framework Selection
Enable relevant frameworks:
- SOC1, SOC2
- GDPR
- HIPAA
- SOX
- PCI DSS
- CCPA/CPRA
- ISO 27001, 27701, 22301

### Control Operations
- Map controls to technical and procedural owners.
- Define required evidence for each control.
- Schedule control attestations and periodic review.
- Track exceptions and remediation workflows.

---

## 9) Audit, Reporting, and Exports

- Generate framework-specific compliance reports.
- Export tenant configuration to Git with signed manifests.
- Preserve immutable audit logs for approvals and system actions.
- Validate PII masking and redaction in all report outputs.

---

## 10) Operational Runbook (Minimum)

### Daily
- Review workflow SLA breaches.
- Review failed onboarding executions.
- Review SIEM alerts for suspicious behavior.

### Weekly
- Review connector health and drift.
- Review access grants and provider consent records.
- Validate translation and accessibility issue backlog.

### Monthly
- Execute compliance evidence review.
- Validate backup/restore controls.
- Run keyboard-only regression for critical journeys.

---

## 11) Incident and Change Management

- Integrate incidents with ticketing platform.
- Use change approvals for policy, workflow, and connector promotions.
- Record all high-impact changes with rollback plans and evidence.
