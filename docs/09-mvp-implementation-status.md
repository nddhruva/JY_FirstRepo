# 09. MVP Implementation Status

## Scope Implemented in Code

The current MVP implementation (`src/aop_api`) includes:

- tenant creation
- application creation/listing
- parent/child application instance management (dev/test/uat/stage/prod)
- intake ingestion endpoint
- questionnaire assignment endpoint
- workflow/questionnaire template upsert endpoints
- onboarding plan generation with connector recommendation heuristic
- onboarding execution endpoint
- connector catalog search and custom scaffold generation
- export request endpoint
- consent request/decision flow
- localization locale list and translation bundle retrieval
- accessibility preference read/update
- compliance framework list and report run request
- auth provider catalog/configuration endpoints
- HR/IAM sync connector catalog/configuration and sync job endpoints

## Test Coverage Included

- `tests/test_api_mvp.py` validates critical business flows:
  - tenant + application + instance lifecycle
  - auth provider config flow
  - sync connector and job lifecycle
  - localization and accessibility endpoints
  - onboarding planning/execution + consent flow
  - compliance reporting flow

## Current Implementation Notes

- Storage is persistent via SQLAlchemy-backed relational database.
- Default migration path is PostgreSQL + Alembic.
- JWT auth and role/policy enforcement are active for protected endpoints.
- Endpoints are intentionally API-first and can be connected to a UI later.
- Catalogs are seeded with representative industry integrations and are extensible.
- Optional Neo4j adapter supports graph relationship projection.

## Next Upgrade Steps

- add background workers for long-running sync/onboarding executions
- generate SDKs from OpenAPI and wire to front-end
- add audit log immutability and SIEM adapters
