# Echo Launcher para PowerShell (Host Local con Detección Automática de IP)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  [ECHO] Plataforma de Comunicacion - Host Local   " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Detección automática de la IP LAN local
try {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*', 'Ethernet*', 'vEthernet*' |
        Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -notlike "127.*" } |
        Select-Object -ExpandProperty IPAddress -First 1)
} catch {
    $localIp = $null
}

if (-not $localIp) {
    $localIp = "127.0.0.1"
}

# 1. Iniciar Backend FastAPI
Write-Host "[1/2] Arrancando Backend en http://0.0.0.0:8000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$scriptDir`" && call backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 2

# 2. Iniciar Frontend Vite en Red
Write-Host "[2/2] Arrancando Cliente Web/Desktop en http://0.0.0.0:5173..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$scriptDir\client-desktop`" && npm run dev -- --host 0.0.0.0 --open" -WindowStyle Normal

Write-Host "`n===================================================" -ForegroundColor Green
Write-Host "  Echo esta corriendo localmente con exito!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  - En esta PC:                    http://localhost:5173" -ForegroundColor White
Write-Host "  - En tu Celular / Otra PC (LAN): http://${localIp}:5173" -ForegroundColor Cyan
Write-Host "  - API Backend (Swagger Docs):    http://${localIp}:8000/docs" -ForegroundColor Gray
Write-Host "  - Modo P2P Directo:              Habilitado (funciona incluso sin servidor)" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Green
