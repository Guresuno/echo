# Echo Launcher para PowerShell
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  [ECHO] Iniciando Plataforma en PC...             " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Iniciar Backend
Write-Host "[1/2] Arrancando Backend en http://localhost:8000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$scriptDir`" && call backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Iniciar Frontend
Write-Host "[2/2] Arrancando Cliente Desktop en red local..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$scriptDir\client-desktop`" && npm run dev -- --host 0.0.0.0 --open" -WindowStyle Normal

Write-Host "`nEcho iniciado con exito." -ForegroundColor Green
Write-Host "  - En esta PC:   http://localhost:5173" -ForegroundColor Green
Write-Host "  - Desde otra PC (Misma Red/LAN): http://192.168.10.213:5173" -ForegroundColor Green
Write-Host "  - API Swagger Docs: http://localhost:8000/docs" -ForegroundColor Green
