# Application Onboarding Platform (AOP) - Solution Blueprint

This repository contains an implementation-ready blueprint for a true multi-cloud, API-first SaaS platform that onboards enterprise applications into vendor products across:

- IGA (Identity Governance and Administration)
- IAM / CIAM
- PAM
- SSO and federation stacks

The solution is designed to be:

- Tenant-safe and role-based
- Workflow-driven (approval, escalation, delegation)
- Connector-aware (OOTB, custom, web services fallback)
- AI-assisted end-to-end
- Audit-ready and exportable to Git/repositories

## Documents

- `docs/00-documentation-index.md`  
  Master index for product documentation (admin, user, API, localization, accessibility, compliance, and operations).

- `docs/01-product-solution-blueprint.md`  
  End-to-end product capabilities, onboarding lifecycle, and non-functional requirements.

- `docs/02-reference-architecture.md`  
  Multi-cloud SaaS architecture, data model, integrations, secrets, and observability design.

- `docs/03-api-first-openapi.yaml`  
  API-first contract (OpenAPI 3.1) for tenants, applications, questionnaires, workflows, connectors, onboarding jobs, exports, approvals, and delegated access.

- `docs/04-rbac-workflows-ai.md`  
  Role model, configurable workflow model, AI feature set, and governance controls.

- `docs/08-identity-auth-and-sync-integrations.md`  
  Identity authentication integrations, user/app sync connectors, and multi-instance application onboarding model.

- `docs/09-mvp-implementation-status.md`  
  Status of the runnable backend MVP implementation and covered capabilities.

- `docs/10-cloud-environment-setup.md`  
  Cloud agent environment configuration for preinstalled Python tooling and optimized pytest/uvicorn startup.

- `docs/11-database-and-security-hardening.md`  
  Database portability model, PostgreSQL + Alembic defaults, JWT auth, and policy enforcement hardening.

- `docs/12-ui-branding-dashboard-reporting-security.md`  
  Branding customization, intuitive dashboard/reporting UX capabilities, and security testing controls.

- `docs/13-frontend-ui-layer.md`  
  Implemented frontend UI layer with theme editor, drag/drop dashboard builder, report designer, and security/compliance center.

- `docs/guides/admin-guide.md`  
  Tenant/platform administration, policy configuration, connectors, and governance operations.

- `docs/guides/user-guide.md`  
  End-user onboarding workflows for app owners, business owners, security, and compliance teams.

- `docs/guides/api-guide.md`  
  Practical API usage, authentication, versioning, examples, and integration patterns.

- `docs/guides/localization-i18n-guide.md`  
  Internationalization (i18n), localization (l10n), translation management, and regionalization controls.

- `docs/guides/keyboard-accessibility-guide.md`  
  Keyboard-only operation model, accessibility requirements, and QA acceptance criteria.

- `docs/guides/operations-guide.md`  
  Day-2 operational runbook for monitoring, incidents, resiliency, accessibility, localization, and compliance operations.

- `docs/compliance/compliance-program.md`  
  Compliance-by-design framework and audit readiness operating model.

- `docs/compliance/control-matrix.md`  
  Control crosswalk for SOC1/SOC2, GDPR, HIPAA, SOX, PCI DSS, CCPA/CPRA, and ISO standards.

## Intended Usage

Use this blueprint as:

1. Product requirements baseline
2. Architecture and security design baseline
3. API contract for engineering teams
4. Implementation guide for connector and workflow teams
5. Governance model for client and internal operations

## MVP Backend Implementation

This repository now includes a runnable API MVP based on the blueprint.

### Project layout

- `src/aop_api/main.py` - FastAPI application with blueprint-aligned endpoints.
- `src/aop_api/models.py` - Pydantic models for core entities and requests.
- `src/aop_api/db_models.py` - SQLAlchemy ORM models for persistent storage.
- `src/aop_api/db.py` - Database engine/session configuration.
- `src/aop_api/security.py` - JWT authentication and password hashing.
- `src/aop_api/policy.py` - Role/permission policy enforcement.
- `src/aop_api/graph.py` - Neo4j graph adapter for graph-capable deployments.
- `alembic/` + `alembic.ini` - Alembic migration scaffolding (PostgreSQL-ready by default).
- `tests/test_api_mvp.py` - End-to-end API tests for core flows.

### Run locally

```bash
python3 -m pip install -r requirements.txt
cp .env.example .env  # then customize secrets/URLs
export AOP_DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/aop"
export AOP_JWT_SECRET_KEY="change-me"
python3 -m alembic upgrade head
python3 -m uvicorn aop_api.main:app --app-dir src --host 0.0.0.0 --port 8000
```

### Key production features included

- Tenant branding configuration + branding asset uploads (logo/fonts/background/palette)
- User-customizable dashboards and role-aware analytics
- Report generation via filters, SQL (safe subset), GraphQL-like query shapes, and AI prompt mode
- Security headers middleware, JWT auth, tenant-scope policy enforcement, and security check scripts

### Get a JWT token

```bash
curl -s -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"platform_admin","password":"ChangeMe123!"}'
```

Use the returned `access_token` as:

```bash
Authorization: Bearer <token>
```

### Run tests

```bash
python3 -m pytest -q
```

### Run frontend UI

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Cloud Agent Environment Config

Repository-level cloud environment bootstrap is configured at:

- `.cursor/environment.json`

Supporting scripts:

- `.cursor/install.sh` - idempotent dependency install into `/workspace/.venv`
- `.cursor/start.sh` - startup preflight and runtime environment setup
- `scripts/run-tests.sh` - optimized test runner wrapper
- `scripts/run-api.sh` - optimized uvicorn runner wrapper
- `scripts/run-migrations.sh` - Alembic migration wrapper
- `scripts/security-checks.sh` - bandit + pip-audit security checks

These settings preinstall and validate the AOP FastAPI MVP dependencies:

- fastapi
- pydantic
- uvicorn
- pytest
- httpx
