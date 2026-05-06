#!/usr/bin/env bash
# SkillSync v2 — One-command startup

set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "  ⬡  SkillSync v2 — AI Resume Intelligence"
echo "  ──────────────────────────────────────────"
echo ""

# Check Python
command -v python3 &>/dev/null || { echo "  ✗ Python3 not found."; exit 1; }

# Install deps if needed
python3 -c "import fastapi" 2>/dev/null || {
  echo "  → Installing Python dependencies…"
  pip install -r "$DIR/requirements.txt" --break-system-packages -q
}

# Start backend
echo "  → Starting FastAPI backend on http://localhost:8000"
cd "$DIR/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACK_PID=$!
sleep 2
echo "  ✓ Backend running (PID $BACK_PID)"

# Serve frontend
echo "  → Serving frontend on http://localhost:3000"
echo ""
echo "  ┌──────────────────────────────────────────┐"
echo "  │  App  →  http://localhost:3000            │"
echo "  │  API  →  http://localhost:8000/docs       │"
echo "  │  Press Ctrl+C to stop                    │"
echo "  └──────────────────────────────────────────┘"
echo ""
cd "$DIR/html"
python3 -m http.server 3000 &
FRONT_PID=$!

trap "echo ''; echo '  Stopping…'; kill $BACK_PID $FRONT_PID 2>/dev/null; exit 0" INT TERM
wait
