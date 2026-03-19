# 13. Frontend UI Layer (Implemented)

## Overview

A production-style React + TypeScript frontend has been implemented in `frontend/` and integrated with the backend APIs.

Key UI modules delivered:

- Theme Editor (tenant branding and asset upload)
- Drag-and-drop Dashboard Builder (widget personalization)
- Dashboard Analytics (progress/completions/denials/errors/focus items)
- Report Designer (filters, SQL, GraphQL-like, AI prompt modes)

## Frontend Stack

- React + TypeScript + Vite
- TanStack Query for API data/mutations
- dnd-kit for drag/drop dashboard composition
- Recharts for chart and graphics rendering

## Module Details

### 1) Theme Editor

Capabilities:
- configure brand name
- configure color palette and fonts
- set logo/background URLs
- upload branding assets by type (logo/font/background/palette/other)

APIs used:
- `GET /tenants/{tenantId}/branding`
- `PUT /tenants/{tenantId}/branding`
- `POST /tenants/{tenantId}/branding/assets`

### 2) Dashboard Builder

Capabilities:
- add widgets from a widget library
- reorder widgets using drag/drop
- remove widgets
- persist dashboard configuration

APIs used:
- `GET /dashboards/me`
- `PUT /dashboards/me`

### 3) Analytics Visualization

Capabilities:
- quick-glance donut/bar charts
- role-aware focus list and KPIs

APIs used:
- `GET /dashboards/analytics`

### 4) Report Designer

Capabilities:
- generate reports in 4 modes:
  - filters
  - safe SQL
  - GraphQL-like
  - AI prompt
- view report summary, table, and chart
- browse recent reports

APIs used:
- `POST /reports/generate`
- `GET /reports`

## UX and Intuitiveness

Implemented UX principles:
- clear workspace navigation (Theme / Dashboard / Reports)
- low-friction forms with immediate feedback
- responsive layout for desktop/tablet
- visual charting for quick decision focus
- persistent auth and tenant workspace context

## Security and Quality Hooks

- backend JWT auth + RBAC policy enforced for all protected API operations
- frontend relies on token-based API client
- backend security headers and upload validation active
- security checks runnable via `scripts/security-checks.sh`

## Run Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Build check:

```bash
npm run build
```
