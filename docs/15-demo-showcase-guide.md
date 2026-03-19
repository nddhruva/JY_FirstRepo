# 15. Demo Showcase Guide (Presenter Playbook)

This guide provides an end-to-end demo setup with realistic sample data and persona-based presentation flow.

## 1) Seed Demo Data

Run backend migrations first, then seed:

```bash
bash scripts/run-migrations.sh
bash scripts/run-demo-seed.sh
```

Optional:

- `AOP_DEMO_TENANT_NAME` to customize tenant display name
- `AOP_DEMO_PASSWORD` to override demo password (default: `DemoPass123!`)

The seed script prints a JSON summary with:
- tenant ID
- demo user credentials
- sample application IDs

## 2) Start API + Frontend

```bash
bash scripts/run-api.sh
cd frontend
cp .env.example .env
npm install
npm run dev
```

## 3) Demo Personas

Use these usernames (default password: `DemoPass123!`):

- `platform_admin`
- `tenant_admin_northstar`
- `app_owner_payments`
- `integration_admin_northstar`
- `compliance_admin_northstar`
- `auditor_northstar`

## 4) Recommended Live Demo Flow

1. **Demo Presentation Center**  
   Show KPI snapshot, status distribution, persona matrix, and narrative script.

2. **Onboarding Workbench** (Tenant Admin / App Owner)  
   - view seeded applications and instances
   - generate onboarding plan
   - execute onboarding (queued)

3. **Integrations Administration** (Integration Admin)  
   - show connector search/scaffold
   - show auth provider configs
   - run sync job and inspect status

4. **Governance & Config** (Tenant Admin / Compliance Admin)  
   - queue export
   - request/approve provider access
   - update questionnaire/workflow templates
   - view localization bundle

5. **Security & Compliance Center** (Compliance Admin / Auditor)  
   - framework coverage
   - queue SOC2 report run
   - demonstrate accessibility preferences

6. **Dashboard + Reports**
   - role-aware analytics
   - report generation modes and visualization output

## 5) Presentation Tips

- Start with Tenant Admin for the broadest access.
- Switch personas to demonstrate strict RBAC and read-only paths.
- Use seeded failed sync/onboarding items to show operational focus handling.
- End with governance and compliance evidence readiness narrative.
