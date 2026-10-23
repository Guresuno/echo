@echo off
title Echo Global Server (Acceso Mundial por Tunel VPN)
echo ========================================================================
echo   [ECHO] Servidor Global y Red Virtual Mesh (Acceso Mundial)
echo ========================================================================

:: 1. Descargar cloudflared si no existe
if not exist "%~dp0cloudflared.exe" (
    echo [0/3] Descargando motor de tunel seguro (cloudflared)...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', '%~dp0cloudflared.exe')"
)

:: 2. Detectar IP Local
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*','vEthernet*' | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress -First 1)"`) do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

:: 3. Arrancar Backend
echo [1/3] Arrancando Backend en http://0.0.0.0:8000...
start "Echo Backend (FastAPI)" cmd /k "cd /d %~dp0 && call backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

:: 4. Arrancar Frontend Vite
echo [2/3] Arrancando Frontend en http://0.0.0.0:5173...
start "Echo Desktop Client" cmd /k "cd /d %~dp0client-desktop && npm run dev -- --host 0.0.0.0"

timeout /t 2 /nobreak >nul

:: 5. Iniciar Tunel Seguro Global
echo [3/3] Abriendo tunel seguro hacia Internet...
start "Echo Global Tunnel" cmd /k "title Echo Global Tunnel && %~dp0cloudflared.exe tunnel --url http://localhost:5173"

echo ========================================================================
echo   Echo esta en linea para todo el mundo!
echo   - En esta PC:                    http://localhost:5173
echo   - En tu Red Wi-Fi local (LAN):   http://%LOCAL_IP%:5173
echo   - Enlace Global (4G / Internet): Mira la ventana 'Echo Global Tunnel'
echo     para copiar tu enlace publico https://*.trycloudflare.com
echo   - Modo VPN Mesh P2P:             Habilitado dentro de la app
echo ========================================================================
pause
