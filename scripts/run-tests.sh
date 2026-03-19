#!/usr/bin/env bash
set -euo pipefail

cd /workspace
PYTHON_BIN="python3"
if [ -f ".venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . .venv/bin/activate
  PYTHON_BIN="python"
fi
export PYTHONPATH="/workspace/src:${PYTHONPATH:-}"

"$PYTHON_BIN" -m pytest -q "$@"
