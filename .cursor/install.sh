#!/usr/bin/env bash
set -euo pipefail

cd /workspace

PYTHON_BIN="python3"
VENV_ACTIVATE=".venv/bin/activate"

# Create and reuse a local virtual environment when available.
if [ ! -f "$VENV_ACTIVATE" ]; then
  rm -rf .venv
  if python3 -m venv .venv >/dev/null 2>&1; then
    :
  else
    echo "python3-venv unavailable; falling back to user-site install."
  fi
fi

if [ -f "$VENV_ACTIVATE" ]; then
  # shellcheck disable=SC1091
  . "$VENV_ACTIVATE"
  PYTHON_BIN="python"
fi

"$PYTHON_BIN" -m pip install --upgrade pip
"$PYTHON_BIN" -m pip install -r requirements.txt
"$PYTHON_BIN" -m pip install -e ".[dev]"
