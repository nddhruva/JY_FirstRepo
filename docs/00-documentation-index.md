# 00. Product Documentation Index

This index provides the complete documentation set for the Application Onboarding Platform (AOP).

## Core Solution Documents

- `01-product-solution-blueprint.md` - Product scope, functional coverage, AI capabilities, and target NFRs.
- `02-reference-architecture.md` - Multi-cloud architecture, core domains, security, observability, and portability.
- `03-api-first-openapi.yaml` - OpenAPI 3.1 source contract for all public APIs.
- `04-rbac-workflows-ai.md` - Role model, workflow model, AI operating model, governance.
- `05-integration-playbook.md` - OOTB -> custom -> web services onboarding strategy.
- `06-ui-ux-experience.md` - Enterprise UX and accessibility direction.
- `07-implementation-roadmap.md` - Phased delivery sequence and engineering guardrails.

## Product Guides

- `guides/admin-guide.md` - Administration guide for tenant and platform operations.
- `guides/user-guide.md` - User guide for application onboarding participants.
- `guides/api-guide.md` - API guide with auth, examples, idempotency, and integration patterns.
- `guides/localization-i18n-guide.md` - Internationalization/localization configuration and operating model.
- `guides/keyboard-accessibility-guide.md` - Keyboard-only usability and accessibility standards.
- `guides/operations-guide.md` - Day-2 service operations, incident response, and compliance operations.

## Compliance and Risk Documentation

- `compliance/compliance-program.md` - Compliance program design and audit readiness lifecycle.
- `compliance/control-matrix.md` - Crosswalk of controls to SOC1/SOC2, GDPR, HIPAA, SOX, PCI DSS, CCPA/CPRA, ISO.

## Intended Audiences

- **Product owner / sponsors**: 01, 07, compliance/*
- **Architecture and engineering**: 02, 03, 04, 05, guides/api-guide.md
- **Admins and operators**: guides/admin-guide.md, guides/localization-i18n-guide.md
- **Business users and onboarding stakeholders**: guides/user-guide.md
- **Design and QA teams**: 06, guides/keyboard-accessibility-guide.md
- **Security, privacy, and audit teams**: compliance/*, 02, 04
