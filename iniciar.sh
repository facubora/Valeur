#!/usr/bin/env bash
# Valeur: levanta todo en esta compu con un solo comando (Mac / Linux).
#   ./iniciar.sh   →  backend en http://localhost:5002 y la app en http://localhost:5173
# Necesita Python 3.9+ y Node.js 20+. La primera vez instala las dependencias.
set -e
cd "$(dirname "$0")"

command -v python3 >/dev/null || { echo "Falta Python 3: https://www.python.org/downloads/"; exit 1; }
command -v npm >/dev/null || { echo "Falta Node.js 20 o más: https://nodejs.org/"; exit 1; }

echo "▸ Backend (precios de mercado)"
cd valeur-backend
[ -d venv ] || python3 -m venv venv
./venv/bin/pip install -q --disable-pip-version-check -r requirements.txt
PORT=5002 ./venv/bin/python backend.py &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT INT TERM

echo "▸ App"
cd ../Valeur
[ -f .env ] || cp .env.example .env
[ -d node_modules ] || npm install --no-fund --no-audit
(sleep 4; open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || true) &
npx vite --port 5173
