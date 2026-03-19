# 12. UI Branding, Dashboards, Reporting, and Security Quality

## Branding and White-Labeling

The platform now supports tenant-level branding configuration and asset uploads to align the product look and feel with client standards.

Capabilities:

- custom brand name
- custom color palette tokens
- custom font mappings
- logo URL and uploaded logo assets
- background image URL and uploaded backgrounds
- additional uploaded assets (including fonts and palette files)

APIs:

- `GET /tenants/{tenantId}/branding`
- `PUT /tenants/{tenantId}/branding`
- `POST /tenants/{tenantId}/branding/assets`

## Intuitive and Fluid UI Foundation

To support an intuitive and fluid UI implementation, the backend provides configuration-driven surfaces rather than hardcoded logic:

- branding token APIs for theme rendering
- dashboard layout + widget configuration APIs
- role-aware analytics APIs for fast focus navigation
- report APIs with configurable and AI-guided query modes

These APIs are intended for a design-system driven front-end where components are dynamically configured per tenant/user.

## Customizable Dashboards

Users can persist personalized dashboards including layout and widgets.

APIs:

- `GET /dashboards/me`
- `PUT /dashboards/me`
- `GET /dashboards/analytics?tenantId=...`

Dashboard analytics include:

- progress
- completions
- denials
- errors
- focus items requiring attention
- chart-ready payloads for quick-glance visualizations

## Reporting (Config/Prompt Driven)

Reports are generated through multiple modes with a single API:

- `filters` mode
- `sql` mode (safe read-only subset)
- `graphql` mode (structured query shape support)
- `ai_prompt` mode (prompt-driven report derivation)

APIs:

- `POST /reports/generate`
- `GET /reports?tenantId=...`

Outputs include:

- data rows
- summaries
- visualization recommendations (charts/graphs)

## Security-Solid Controls for Testing Criteria

Implemented security controls to support penetration testing and SAST/DAST readiness:

- JWT authentication for protected APIs
- role/permission policy enforcement
- tenant scope enforcement
- secure upload validation with file size/type checks
- strict SQL reporting safeguards (read-only allowlist + keyword restrictions)
- security headers middleware (`CSP`, `X-Frame-Options`, `nosniff`, etc.)
- dependency security check pipeline (`bandit` + `pip-audit`)

Security scripts:

- `scripts/security-checks.sh`

Note: formal pass/fail against enterprise pen-testing criteria depends on environment-level controls, infrastructure hardening, and external test execution context.
