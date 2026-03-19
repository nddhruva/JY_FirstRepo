# Compliance Control Matrix (Crosswalk)

This matrix maps core product controls to major frameworks and regulations.

## Legend

- **Covered**: Product includes technical capability and operating pattern.
- **Shared**: Requires tenant/customer process and configuration in addition to product controls.
- **External**: Depends on external audit/legal determination.

---

## 1) Identity and Access Controls

| Control Objective | SOC1 | SOC2 | GDPR | HIPAA | SOX | PCI DSS | CCPA/CPRA | ISO 27001 | ISO 27701 | ISO 22301 | Coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SSO + MFA enforcement | Covered | Covered | Shared | Covered | Shared | Covered | Shared | Covered | Covered | Shared | Covered |
| RBAC + ABAC authorization | Covered | Covered | Covered | Covered | Covered | Covered | Covered | Covered | Covered | Shared | Covered |
| Segregation of duties | Shared | Covered | Shared | Shared | Covered | Covered | Shared | Covered | Shared | Shared | Shared |

---

## 2) Data Protection and Privacy

| Control Objective | SOC1 | SOC2 | GDPR | HIPAA | SOX | PCI DSS | CCPA/CPRA | ISO 27001 | ISO 27701 | ISO 22301 | Coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Encryption at rest and in transit | Covered | Covered | Covered | Covered | Shared | Covered | Covered | Covered | Covered | Shared | Covered |
| Data minimization and purpose limitation | Shared | Shared | Covered | Shared | Shared | Shared | Covered | Covered | Covered | Shared | Shared |
| Privacy rights workflows (DSAR) | Shared | Shared | Covered | Shared | Shared | Shared | Covered | Covered | Covered | Shared | Shared |
| Data retention and deletion policy enforcement | Shared | Covered | Covered | Covered | Shared | Covered | Covered | Covered | Covered | Shared | Shared |

---

## 3) Audit and Monitoring

| Control Objective | SOC1 | SOC2 | GDPR | HIPAA | SOX | PCI DSS | CCPA/CPRA | ISO 27001 | ISO 27701 | ISO 22301 | Coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Immutable audit logging | Covered | Covered | Covered | Covered | Covered | Covered | Covered | Covered | Covered | Shared | Covered |
| SIEM integration (Splunk/others) | Shared | Covered | Shared | Covered | Covered | Covered | Shared | Covered | Shared | Shared | Covered |
| Control evidence collection | Shared | Covered | Shared | Shared | Covered | Covered | Shared | Covered | Shared | Shared | Shared |

---

## 4) Change Management and SDLC

| Control Objective | SOC1 | SOC2 | GDPR | HIPAA | SOX | PCI DSS | CCPA/CPRA | ISO 27001 | ISO 27701 | ISO 22301 | Coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Versioned templates and approvals | Covered | Covered | Shared | Shared | Covered | Shared | Shared | Covered | Shared | Shared | Covered |
| Release quality gates (security/accessibility) | Shared | Covered | Shared | Shared | Shared | Covered | Shared | Covered | Covered | Shared | Shared |
| Incident and remediation workflow | Shared | Covered | Shared | Covered | Shared | Covered | Shared | Covered | Shared | Covered | Shared |

---

## 5) Business Continuity and Resilience

| Control Objective | SOC1 | SOC2 | GDPR | HIPAA | SOX | PCI DSS | CCPA/CPRA | ISO 27001 | ISO 27701 | ISO 22301 | Coverage |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Backup and restore controls | Covered | Covered | Shared | Covered | Shared | Covered | Shared | Covered | Shared | Covered | Covered |
| Disaster recovery testing | Shared | Covered | Shared | Shared | Shared | Covered | Shared | Covered | Shared | Covered | Shared |
| Regional failover and availability controls | Shared | Covered | Shared | Shared | Shared | Shared | Shared | Covered | Shared | Covered | Shared |

---

## 6) Product-Specific Compliance Capabilities

- Consent-gated provider access for non-sensitive tenant data.
- Secret reference architecture to avoid plaintext credential persistence.
- Config export with signatures and traceability.
- Compliance report generation APIs for framework-specific evidence packs.
- Keyboard-only and accessibility controls to support inclusive access standards.
- Localization controls for policy text and regional user guidance.

---

## 7) Evidence Examples by Control Type

- Access controls: role assignments, policy decisions, auth logs
- Change controls: PR approvals, release records, deployment logs
- Monitoring controls: SIEM alerts, incident timelines, response actions
- Privacy controls: DSAR tickets, retention jobs, consent records
- Security controls: key rotation logs, vulnerability scans, patch evidence

---

## 8) Residual Responsibilities

Customer/tenant responsibilities generally include:
- selecting in-scope frameworks
- configuring tenant policies and retention
- operating user lifecycle governance
- participating in control testing and external audits

Provider responsibilities generally include:
- platform control implementation and operation
- evidence instrumentation and reporting tooling
- secure infrastructure and service operations
