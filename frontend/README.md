# AOP Frontend UI Layer

Frontend implementation for the Application Onboarding Platform.

## Implemented Modules

- Theme Editor (branding tokens and asset uploads)
- Drag/drop Dashboard Builder (widget composition)
- Analytics visualizations (progress, denials, errors, focus areas)
- Report Designer (filters, SQL, GraphQL-like, and AI prompt modes)

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
