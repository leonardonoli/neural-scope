#!/bin/bash
# Start Neural Scope — backend on :8001, frontend on :3099

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[neural-scope] Starting backend..."
cd "$ROOT/backend/src"
"$ROOT/backend/.venv/bin/uvicorn" main:app --port 8001 --reload &
BACKEND_PID=$!

echo "[neural-scope] Starting frontend..."
cd "$ROOT/frontend"
npm run dev -- --port 3099 &
FRONTEND_PID=$!

echo "[neural-scope] Ready:"
echo "  Frontend: http://localhost:3099"
echo "  Backend:  http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
