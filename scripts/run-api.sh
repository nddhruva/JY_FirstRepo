#!/usr/bin/env bash
set -euo pipefail

cd /workspace
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

API_HOST="${AOP_API_HOST:-127.0.0.1}"
API_PORT="${AOP_API_PORT:-8000}"

"$PYTHON_BIN" -m uvicorn aop_api.main:app --app-dir src --host "$API_HOST" --port "$API_PORT" "$@"
