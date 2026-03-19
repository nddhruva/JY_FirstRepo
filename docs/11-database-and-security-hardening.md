# 11. Database and Security Hardening

## Overview

The MVP backend has been upgraded from an in-memory store to a persistent, production-oriented data layer with:

- SQLAlchemy-backed relational persistence
- Alembic migrations (PostgreSQL-ready by default)
- JWT authentication
- Role/permission policy enforcement
- Optional Neo4j graph integration adapter

## Relational Database Support Model

The platform supports any relational database accessible via SQLAlchemy dialects, including common on-prem and cloud-managed options:

- PostgreSQL (default production profile)
- MySQL / MariaDB
- Microsoft SQL Server
- Oracle
- SQLite (local/dev/test)

### Cloud database flavors

- **AWS**: RDS/Aurora PostgreSQL/MySQL, RDS SQL Server/Oracle
- **Azure**: Azure Database for PostgreSQL/MySQL, Azure SQL
- **GCP**: Cloud SQL PostgreSQL/MySQL/SQL Server, AlloyDB

## Graph Database Support

Graph support is provided through a Neo4j adapter (`src/aop_api/graph.py`) enabled by:

- `AOP_GRAPH_DATABASE_URL=neo4j://...` (or `bolt://...`)

When configured, application-instance topology can be synchronized to graph nodes/edges for relationship traversal use cases.

## Default PostgreSQL + Alembic

Alembic files are included:

- `alembic.ini`
- `alembic/env.py`
- `alembic/versions/0001_initial_schema.py`
- `alembic/versions/0002_branding_dashboard_reports.py`

Run migrations:

```bash
export AOP_DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/aop"
python3 -m alembic upgrade head
```

## JWT Authentication

Authentication endpoint:

- `POST /auth/token` with JSON body `{ "username": "...", "password": "..." }`

The service issues signed JWT tokens using:

- `AOP_JWT_SECRET_KEY`
- `AOP_JWT_ALGORITHM` (default `HS256`)
- `AOP_JWT_EXP_MINUTES`

## Policy Enforcement

Policy enforcement is implemented in `src/aop_api/policy.py` with:

- role-to-permission mapping
- per-endpoint permission checks
- tenant-scope enforcement (ABAC-style tenant boundary)

Example roles:

- `platform_admin`
- `tenant_admin`
- `app_owner`
- `integration_admin`
- `compliance_admin`
- `auditor`

## Security Testing and Library Hygiene

Implemented security checks:

- `scripts/security-checks.sh`
  - `bandit` (SAST-style code scanning)
  - `pip-audit` (dependency vulnerability scanning)

Library posture:

- deprecated password hashing dependency removed
- bcrypt-based password hashing implemented
- dependency set pinned to maintained current versions in `requirements.txt`/`pyproject.toml`

## Bootstrap Security

On startup, a bootstrap admin account is seeded if missing:

- `AOP_BOOTSTRAP_ADMIN_USERNAME` (default: `platform_admin`)
- `AOP_BOOTSTRAP_ADMIN_PASSWORD` (default: `ChangeMe123!`)

For production, rotate defaults immediately and integrate enterprise IdP/JIT provisioning.
