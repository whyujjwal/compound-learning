#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Starting PostgreSQL (Docker)..."
if docker info &>/dev/null; then
  docker compose -f "$ROOT/docker-compose.yml" up -d
else
  echo "    Docker not running — using local PostgreSQL"
fi

echo "==> Backend setup..."
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Running tests..."
pytest -q

echo "==> Starting API on :8000..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
API_PID=$!

echo "==> Frontend setup..."
cd "$ROOT/frontend"
npm install -q
npm run dev &
WEB_PID=$!

echo ""
echo "Compound is running:"
echo "  App:  http://localhost:3000"
echo "  API:  http://localhost:8000/docs"
echo ""
trap "kill $API_PID $WEB_PID 2>/dev/null" EXIT
wait
