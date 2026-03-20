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
export AOP_API_HOST="${AOP_API_HOST:-127.0.0.1}"
export AOP_API_PORT="${AOP_API_PORT:-8000}"
export AOP_CORS_ORIGINS="${AOP_CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

is_port_free() {
  local port="$1"
  "$PYTHON_BIN" - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind(("127.0.0.1", port))
    print("free")
except OSError:
    print("in-use")
finally:
    sock.close()
PY
}

ensure_free_port() {
  local port="$1"
  if [ "$(is_port_free "$port")" != "free" ]; then
    echo "[local] ERROR: port $port is already in use on 127.0.0.1."
    echo "[local] Stop the existing process or change AOP_API_PORT/frontend port before retrying."
    exit 1
  fi
}

ensure_free_port "$AOP_API_PORT"
ensure_free_port "5173"

echo "[local] backend:  http://${AOP_API_HOST}:${AOP_API_PORT}"
echo "[local] health:   http://${AOP_API_HOST}:${AOP_API_PORT}/health"
echo "[local] frontend: http://localhost:5173"
echo ""
echo "[local] starting backend and frontend..."

bash scripts/run-api.sh &
API_PID=$!

cleanup() {
  if kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

npm --prefix frontend run dev -- --host 127.0.0.1 --port 5173 --strictPort
