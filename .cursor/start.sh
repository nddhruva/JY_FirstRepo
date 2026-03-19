#!/usr/bin/env bash
set -euo pipefail

cd /workspace

# Keep the shell prepared for quick test/API execution.
SYSTEM_PYTHON="/usr/bin/python3"
if [ ! -x "$SYSTEM_PYTHON" ]; then
  SYSTEM_PYTHON="$(command -v python3)"
fi
PYTHON_BIN="$SYSTEM_PYTHON"
if [ -f ".venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . .venv/bin/activate
  PYTHON_BIN="python"
fi

export PYTHONPATH="/workspace/src:${PYTHONPATH:-}"

# Pre-flight import check to fail fast if env bootstrap is incomplete.
"$PYTHON_BIN" - <<'PY'
import importlib.util
required = ("fastapi", "pydantic", "uvicorn", "pytest", "httpx", "sqlalchemy", "alembic", "jwt", "bcrypt")
missing = [m for m in required if importlib.util.find_spec(m) is None]
if missing:
    raise SystemExit(f"Missing dependencies after startup: {', '.join(missing)}")
print("AOP cloud environment ready.")
PY

if command -v npm >/dev/null 2>&1 && [ -f "frontend/package.json" ]; then
  if [ ! -d "frontend/node_modules" ]; then
    npm --prefix frontend install >/dev/null
  fi
fi
