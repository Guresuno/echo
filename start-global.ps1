# Echo Global Server Launcher (Acceso Mundial por Tunel Seguro sin abrir puertos)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  [ECHO] Servidor Global & Red Virtual Mesh (Acceso Mundial)           " -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

# 1. Verificar si cloudflared.exe existe; si no, descargarlo automáticamente
$cloudflaredPath = Join-Path $scriptDir "cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "[0/3] Descargando motor de tunel seguro (cloudflared)..." -ForegroundColor Yellow
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        (New-Object System.Net.WebClient).DownloadFile(
            "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe",
            $cloudflaredPath
        )
        Write-Host "Motor de tunel descargado con exito." -ForegroundColor Green
    } catch {
        Write-Host "No se pudo descargar cloudflared automaticamente. Se usara fallback a red local." -ForegroundColor Red
    }
}

# Detección de IP Local
try {
    $localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*', 'Ethernet*', 'vEthernet*' |
        Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -notlike "127.*" } |
        Select-Object -ExpandProperty IPAddress -First 1)
} catch {
    $localIp = "127.0.0.1"
}

# 2. Iniciar Backend FastAPI
Write-Host "[1/3] Arrancando Backend en http://0.0.0.0:8000..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$scriptDir`" && call backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 2

# 3. Iniciar Frontend Vite
Write-Host "[2/3] Arrancando Cliente Web/Desktop en http://0.0.0.0:5173..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$scriptDir\client-desktop`" && npm run dev -- --host 0.0.0.0" -WindowStyle Normal

Start-Sleep -Seconds 2

# 4. Iniciar Tunel Seguro Global
Write-Host "[3/3] Abriendo tunel seguro hacia Internet..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k title Echo Global Tunnel && `"$cloudflaredPath`" tunnel --url http://localhost:5173" -WindowStyle Normal

Write-Host "`n========================================================================" -ForegroundColor Green
Write-Host "  [ECHO] Servidor en linea para cualquier red del mundo!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "  - En esta PC:                    http://localhost:5173" -ForegroundColor White
Write-Host "  - En tu Red Wi-Fi local (LAN):   http://${localIp}:5173" -ForegroundColor Cyan
Write-Host "  - Enlace Global (4G / Internet): Revisa la ventana 'Echo Global Tunnel' para ver tu enlace https://*.trycloudflare.com" -ForegroundColor Yellow
Write-Host "  - Modo VPN Mesh P2P Directo:     Integrado (sin servidor)" -ForegroundColor Green
Write-Host "========================================================================`n" -ForegroundColor Green
