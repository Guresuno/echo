@echo off
title Echo Launcher (PC)
echo ===================================================
echo   [ECHO] Iniciando Plataforma en PC...
echo ===================================================

:: 1. Iniciar Backend FastAPI
echo [1/2] Arrancando Backend en http://localhost:8000...
start "Echo Backend (FastAPI)" cmd /k "cd /d %~dp0 && call backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Esperar 2 segundos
timeout /t 2 /nobreak >nul

:: 3. Iniciar Frontend Vite (Desktop Client accesible en red)
echo [2/2] Arrancando Cliente Desktop en red local...
start "Echo Desktop Client" cmd /k "cd /d %~dp0client-desktop && npm run dev -- --host 0.0.0.0 --open"

echo ===================================================
echo   Echo esta corriendo!
echo   - En esta PC:   http://localhost:5173
echo   - Desde otra PC (Misma Red Wi-Fi/LAN): http://192.168.10.213:5173
echo   - API Swagger:  http://localhost:8000/docs
echo ===================================================
