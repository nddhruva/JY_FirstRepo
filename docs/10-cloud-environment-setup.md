# 10. Cloud Environment Setup

## Objective

Ensure cloud agents start with Python 3 tooling and all AOP FastAPI MVP dependencies preinstalled, with fast execution for `pytest` and `uvicorn` in `/workspace`.

## Configuration Files

- `.cursor/environment.json`
  - `install`: `bash .cursor/install.sh`
  - `start`: `bash .cursor/start.sh`
  - `env`: sets `PYTHONPATH=/workspace/src` and Python/pip runtime flags
  - `persistedDirectories`: caches `.venv`, `.pytest_cache`, and pip cache

- `.cursor/install.sh`
  - Creates/reuses `/workspace/.venv` when `python3-venv` is available
  - Falls back to user-site Python installs when venv tooling is unavailable
  - Installs `requirements.txt`
  - Installs dev extras from `pyproject.toml` (`.[dev]`)
  - Installs frontend dependencies when `frontend/package.json` exists

- `.cursor/start.sh`
  - Activates `.venv` when present
  - Exports `PYTHONPATH` for package discovery
  - Performs dependency preflight import checks
  - Ensures frontend `node_modules` exist for UI workflows

## Optimized Developer Commands

- `scripts/run-tests.sh`
  - Runs `python -m pytest -q`
  - Uses venv + preconfigured `PYTHONPATH`

- `scripts/run-api.sh`
  - Runs `python -m uvicorn aop_api.main:app --app-dir src --host 0.0.0.0 --port 8000`
  - Uses venv + preconfigured `PYTHONPATH`

- `scripts/run-migrations.sh`
  - Runs `python -m alembic upgrade head`
  - Uses venv + preconfigured `PYTHONPATH`

- `scripts/security-checks.sh`
  - Runs `bandit` and `pip-audit`
  - Supports SAST/dependency vulnerability checks in cloud agents

## Notes

- Install/start scripts are idempotent to support repeated cloud-agent boots.
- Caching `.venv` and pip cache reduces startup time for future agents.
