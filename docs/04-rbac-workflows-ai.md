# 04. RBAC, Workflows, and AI Operating Model

## Role-Based Access Control Model

## Role Catalog

1. **Platform Super Admin (Provider Internal)**
   - Global platform operations and policy lifecycle
   - No tenant-sensitive runtime data access without explicit consent and scope

2. **Tenant Admin**
   - Manage tenant users, roles, integrations, templates, workflow policies

3. **Application Owner**
   - Create/edit owned applications, submit onboarding requests, respond to app-owner questionnaire sections

4. **Business Owner**
   - Business approvals, ownership attestation, risk acceptance

5. **Compliance Analyst**
   - Regulatory mapping, control evidence validation, compliance approvals

6. **Security Reviewer**
   - Security architecture review, policy checks, high-risk gate approvals

7. **Integration Engineer**
   - Connector mapping, testing, deployment, troubleshooting

8. **Auditor (Read-Only)**
   - Access immutable audit trails and evidence packages

9. **Support Operator (Scoped)**
   - Operational support actions only for authorized tenant and with consent

10. **Localization Manager**
   - Manages translation bundles, locale rollout, and localization QA status

11. **Compliance Manager**
   - Owns control attestations, evidence completeness, and compliance reports

---

## Permission Strategy

- **RBAC base permissions**: Create/read/update/delete scoped by role.
- **ABAC overlays**:
  - tenantId
  - application ownership
  - environment (dev/test/prod)
  - workflow stage
  - data classification
- **Just-in-time elevation** for privileged actions with approval + audit.

---

## Data Access Guardrails

- Clients can only access their own tenant data.
- Provider-side product owner visibility requires:
  1) explicit client approval,
  2) non-sensitive data scope,
  3) time-boxed access token,
  4) full audit logging.
- Compliance and audit roles can view only scoped evidence based on framework and need-to-know.

---

## Workflow Engine (Configurable)

### Workflow Features

- Sequential and parallel approvals
- Escalation by SLA timeout
- Delegation (temporary/permanent with policy guardrails)
- Conditional branching
- Rework loops
- Exception handling and override approvals

### Sample Workflow DSL (YAML)

```yaml
name: default-app-onboarding
version: 3
triggers:
  - event: application.created
nodes:
  - id: intake
    type: task
    assigneeRole: ApplicationOwner
    slaHours: 48
  - id: security-review
    type: approval
    assigneeRole: SecurityReviewer
    condition: app.dataClassification in [confidential, restricted]
    slaHours: 72
    onTimeout: escalate-security-manager
  - id: compliance-review
    type: approval
    assigneeRole: ComplianceAnalyst
    slaHours: 72
  - id: business-approval
    type: approval
    assigneeRole: BusinessOwner
    slaHours: 48
  - id: connector-plan
    type: task
    assigneeRole: IntegrationEngineer
  - id: execute-onboarding
    type: task
    assigneeRole: IntegrationEngineer
  - id: complete
    type: end
transitions:
  - from: intake
    to: security-review
  - from: security-review
    to: compliance-review
  - from: compliance-review
    to: business-approval
  - from: business-approval
    to: connector-plan
  - from: connector-plan
    to: execute-onboarding
  - from: execute-onboarding
    to: complete
```

---

## Questionnaire Administration Model

- Template builder with section/question libraries
- Rule engine:
  - show/hide by app type
  - show/hide by vendor target
  - show/hide by classification/risk
- Versioned publication:
  - draft -> approved -> active -> retired
- Backward compatibility:
  - in-flight onboarding remains pinned to assigned template version

Localization requirements:
- questionnaire text and help content must be locale-aware
- translation bundle version must be recorded in questionnaire instance metadata

---

## AI Capability Architecture

## 1) Connector Recommendation Engine

Inputs:
- questionnaire answers
- app schema and protocol metadata
- target vendor/product/version
- historical success/failure telemetry across anonymized tenants

Outputs:
- recommended strategy (OOTB/custom/web services)
- confidence score
- reasons/features influencing recommendation

## 2) Guided Onboarding Copilot

- Step-by-step instructions during onboarding
- Role-aware guidance (app owner vs security reviewer)
- Embedded policy explanations and recommended next actions

## 3) Natural Language Capture

- Convert plain-English responses into structured schema fields
- Ask clarifying follow-up questions
- Suggest where to locate missing information

## 4) Risk & Weightage Model

- Dynamic score from:
  - app criticality
  - data sensitivity
  - auth model
  - provisioning complexity
  - control gaps
- Explainable output with factor-level attribution

## 5) Additional Competitive AI Features

- Similar application pattern reuse
- Auto-complete connector mapping
- Approval path optimization suggestions
- Anomaly detection in onboarding responses
- Evidence quality and completeness checks
- Translation quality and terminology consistency suggestions

---

## Compliance Operating Model

- Framework-aware evidence requirements are attached to workflow stages.
- Control exception workflows require explicit risk acceptance and expiry.
- Compliance reports are generated via API and signed for audit traceability.
- Periodic attestations are enforced by workflow schedules and escalations.

---

## AI Governance and Safety

- Human-in-the-loop for high-impact recommendations
- Prompt and response logging (with sensitive data controls)
- Model output confidence thresholds
- Region-aware model routing for data residency
- Explainability records in audit trail

---

## Operational KPIs

- Questionnaire completion time
- Approval turnaround SLA adherence
- Connector recommendation accuracy
- OOTB vs custom connector ratio
- Onboarding success rate by vendor/domain
- Post-onboarding defect and rework rate
