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

"$PYTHON_BIN" "scripts/seed-demo-data.py" "$@"
