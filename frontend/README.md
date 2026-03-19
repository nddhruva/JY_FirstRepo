# AOP Frontend UI Layer

Frontend implementation for the Application Onboarding Platform.

## Implemented Modules

- Demo Presentation Center (ready-to-present KPI and persona walkthrough)
- Onboarding Workbench (application create/list, instances, ingest, questionnaire assignment, plan/execute)
- Integrations Admin (connector search/scaffold, auth provider config, sync connector config/job execution)
- Governance & Config Center (exports, provider consent, questionnaire/workflow templates, localization viewer)
- Theme Editor (branding tokens and asset uploads)
- Drag/drop Dashboard Builder (widget composition)
- Analytics visualizations (progress, denials, errors, focus areas)
- Report Designer (filters, SQL, GraphQL-like, and AI prompt modes)
- Security & Compliance Center (framework coverage, compliance run trigger, accessibility preferences)

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment

- `VITE_API_BASE_URL` -> backend API base URL (default: `http://localhost:8000`)
- `VITE_API_TIMEOUT_MS` -> request timeout in milliseconds (default: `20000`)
