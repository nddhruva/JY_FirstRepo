#!/usr/bin/env bash
set -euo pipefail

cd /workspace

SYSTEM_PYTHON="/usr/bin/python3"
if [ ! -x "$SYSTEM_PYTHON" ]; then
  SYSTEM_PYTHON="$(command -v python3)"
fi
PYTHON_BIN="$SYSTEM_PYTHON"
VENV_ACTIVATE=".venv/bin/activate"

# Create and reuse a local virtual environment when available.
if [ ! -f "$VENV_ACTIVATE" ]; then
  rm -rf .venv
  if "$SYSTEM_PYTHON" -m venv .venv >/dev/null 2>&1; then
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

if command -v npm >/dev/null 2>&1 && [ -f "frontend/package.json" ]; then
  npm --prefix frontend install
fi
