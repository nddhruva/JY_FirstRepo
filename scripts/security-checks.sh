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

echo "[security] running bandit..."
"$PYTHON_BIN" -m bandit -q -r src/aop_api

echo "[security] running pip-audit in isolated project env..."
"$PYTHON_BIN" -m pip install --user virtualenv >/dev/null
"$PYTHON_BIN" -m virtualenv .audit-venv >/dev/null
. .audit-venv/bin/activate
python -m pip install -r requirements.txt >/dev/null
python -m pip install pip-audit >/dev/null
python -m pip_audit --local
