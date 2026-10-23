@echo off
title Echo Launcher (PC - Local Host)
echo ===================================================
echo   [ECHO] Iniciando Plataforma de Comunicacion...
echo ===================================================

:: Deteccion de IP Local mediante PowerShell
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*','vEthernet*' | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress -First 1)"`) do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

:: 1. Iniciar Backend FastAPI
echo [1/2] Arrancando Backend en http://0.0.0.0:8000...
start "Echo Backend (FastAPI)" cmd /k "cd /d %~dp0 && call backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Esperar 2 segundos
timeout /t 2 /nobreak >nul

:: 3. Iniciar Frontend Vite (Desktop/Web Client accesible en red)
echo [2/2] Arrancando Cliente en http://0.0.0.0:5173...
start "Echo Desktop Client" cmd /k "cd /d %~dp0client-desktop && npm run dev -- --host 0.0.0.0 --open"

echo ===================================================
echo   Echo esta corriendo localmente!
echo   - En esta PC:                    http://localhost:5173
echo   - En tu Celular / Otra PC (LAN): http://%LOCAL_IP%:5173
echo   - Documentacion API (Swagger):   http://%LOCAL_IP%:8000/docs
echo   - Modo P2P Directo:              Habilitado (funciona sin servidor)
echo ===================================================
pause
