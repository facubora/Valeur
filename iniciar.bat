@echo off
rem Valeur: levanta todo en esta compu con un solo doble clic (Windows).
rem Backend en http://localhost:5002 y la app en http://localhost:5173
rem Necesita Python 3.9+ y Node.js 20+. La primera vez instala las dependencias.
cd /d "%~dp0"

where python >nul 2>nul || (echo Falta Python 3: https://www.python.org/downloads/ & pause & exit /b 1)
where npm >nul 2>nul || (echo Falta Node.js 20 o mas: https://nodejs.org/ & pause & exit /b 1)

echo Backend (precios de mercado)
cd valeur-backend
if not exist venv python -m venv venv
venv\Scripts\python -m pip install -q --disable-pip-version-check -r requirements.txt
start "Valeur - backend" cmd /k "set PORT=5002&& venv\Scripts\python backend.py"

echo App
cd ..\Valeur
if not exist .env copy .env.example .env >nul
if not exist node_modules call npm install --no-fund --no-audit
start "" http://localhost:5173
call npx vite --port 5173
