# ==============================================================================
# ECHO - Zero-Touch Environment & Dependency Setup Script (Windows PowerShell)
# Master Setup Script for Full-Stack Realtime Communication Platform
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$SkipNpm,
    [switch]$SkipPip,
    [switch]$SkipToolInstall
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " [ECHO] Verificando e Instalando Entorno de Desarrollo...  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

function Write-Step($name) {
    Write-Host "`n[+] Verificando: $name..." -ForegroundColor Yellow
}

function Write-Success($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Warning($msg) {
    Write-Host "  [AVISO] $msg" -ForegroundColor DarkYellow
}

function Write-ErrorMsg($msg) {
    Write-Host "  [ERROR] $msg" -ForegroundColor Red
}

# 1. NODE.JS & NPM
Write-Step "Node.js y Gestor de Paquetes (npm)"
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodeVer = & node -v
    Write-Success "Node.js detectado: $nodeVer"
} else {
    Write-Warning "Node.js no encontrado. Intentando instalar via winget/choco..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
    }
}

# 2. PYTHON 3.11+ & PIP / VENV
Write-Step "Python 3.11+ y PIP"
$pyCmd = Get-Command python -ErrorAction SilentlyContinue
if ($pyCmd) {
    $pyVer = & python --version
    Write-Success "Python detectado: $pyVer"
} else {
    Write-Warning "Python no encontrado. Intentando instalar..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install python312 -y
    }
}

# 3. RUST & CARGO (Para compilación Tauri .exe)
Write-Step "Rust y Cargo (Tauri Native Compiler)"
$rustCmd = Get-Command rustc -ErrorAction SilentlyContinue
if (-not $rustCmd -and (Test-Path "$env:USERPROFILE\.cargo\bin\rustc.exe")) {
    $env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH
    $rustCmd = Get-Command rustc -ErrorAction SilentlyContinue
}

if ($rustCmd) {
    $rustVer = & rustc --version
    $cargoVer = & cargo --version
    Write-Success "Rust & Cargo detectados: $rustVer | $cargoVer"
} else {
    Write-Warning "Rust no detectado. Descargando e instalando rustup desatendido..."
    $rustupExe = "$env:TEMP\rustup-init.exe"
    try {
        Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupExe -UseBasicParsing
        & $rustupExe -y --default-toolchain stable-x86_64-pc-windows-msvc
        $env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH
        Write-Success "Rust instalado correctamente."
    } catch {
        Write-ErrorMsg "Fallo al instalar Rust: $_"
    }
}

# 4. JAVA JDK 17 & ANDROID SDK (Para compilación APK sin Expo Go)
Write-Step "Java JDK 17 y Android SDK"
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($javaCmd) {
    $javaVer = & java -version 2>&1 | Select-Object -First 1
    Write-Success "Java detectado: $javaVer"
} else {
    Write-Warning "Java JDK 17 no detectado. Intentando instalar..."
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install openjdk17 -y
    }
}

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCmd -and (Test-Path "R:\Android\Sdk\platform-tools\adb.exe")) {
    $env:ANDROID_HOME = "R:\Android\Sdk"
    $env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;" + $env:PATH
    $adbCmd = Get-Command adb -ErrorAction SilentlyContinue
}

if ($adbCmd) {
    $adbVer = & adb version | Select-Object -First 1
    Write-Success "Android SDK / ADB detectado: $adbVer"
} else {
    Write-Warning "Android SDK no detectado en PATH standard."
}

# 5. DOCKER & DOCKER COMPOSE
Write-Step "Docker Engine & Docker Compose"
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCmd) {
    $dockerVer = & docker --version
    Write-Success "Docker detectado: $dockerVer"
} else {
    Write-Warning "Docker no está instalado o no está en el PATH. La plataforma usará fallbacks locales automáticos (In-memory Redis, Local Storage, etc.)."
}

# 6. FFMPEG & HERRAMIENTAS MULTIMEDIA (Opus / WebP)
Write-Step "FFmpeg (Procesamiento de audio Opus y stickers WebP)"
$ffmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegCmd -and (Test-Path "$env:LOCALAPPDATA\ffmpeg\ffmpeg.exe")) {
    $env:PATH = "$env:LOCALAPPDATA\ffmpeg;" + $env:PATH
    $ffmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
}

if ($ffmpegCmd) {
    Write-Success "FFmpeg detectado correctamente."
} else {
    Write-Warning "FFmpeg no encontrado. Intentando instalar portable en AppData..."
    try {
        $dest = "$env:LOCALAPPDATA\ffmpeg"
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile "$env:TEMP\ffmpeg.zip" -UseBasicParsing
        Expand-Archive -Path "$env:TEMP\ffmpeg.zip" -DestinationPath "$env:TEMP\ffmpeg_extracted" -Force
        $bin = Get-ChildItem -Path "$env:TEMP\ffmpeg_extracted" -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
        Copy-Item (Split-Path $bin.FullName -Parent)/* -Destination $dest -Recurse -Force
        $env:PATH = "$dest;" + $env:PATH
        Write-Success "FFmpeg instalado en $dest"
    } catch {
        Write-Warning "No se pudo descargar FFmpeg automáticamente. Se usará el procesador de audio con fallback en Python."
    }
}

# 7. DRIVERS SQL SERVER (ODBC Driver for SQL Server)
Write-Step "ODBC Drivers de Microsoft SQL Server"
$odbcDrivers = Get-OdbcDriver | Where-Object { $_.Name -like "*SQL Server*" }
if ($odbcDrivers) {
    Write-Success "Drivers ODBC detectados: $($odbcDrivers.Name -join ', ')"
} else {
    Write-Warning "No se detectaron drivers ODBC de SQL Server. Se intentará instalar..."
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install sqlserver-odbcdriver -y
    }
}

# 8. INSTALACIÓN DE LIBRERÍAS DE PYTHON (BACKEND)
if (-not $SkipPip) {
    Write-Step "Instalación de dependencias de Python (Backend)"
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $backendDir = Join-Path $scriptDir "backend"
    $reqFile = Join-Path $backendDir "requirements.txt"
    
    if (Test-Path $reqFile) {
        Write-Host "  Ejecutando pip install -r $reqFile..." -ForegroundColor Cyan
        & python -m pip install --upgrade pip
        & python -m pip install -r $reqFile
        Write-Success "Dependencias de Python instaladas con éxito."
    }
}

# 9. INSTALACIÓN DE DEPENDENCIAS JAVASCRIPT / TYPESCRIPT
if (-not $SkipNpm) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    
    # Desktop
    $desktopDir = Join-Path $scriptDir "client-desktop"
    if (Test-Path (Join-Path $desktopDir "package.json")) {
        Write-Step "Instalando dependencias en client-desktop..."
        Push-Location $desktopDir
        & cmd.exe /c npm install
        Pop-Location
        Write-Success "Dependencias de Desktop instaladas."
    }

    # Mobile
    $mobileDir = Join-Path $scriptDir "client-mobile"
    if (Test-Path (Join-Path $mobileDir "package.json")) {
        Write-Step "Instalando dependencias en client-mobile..."
        Push-Location $mobileDir
        & cmd.exe /c npm install
        Pop-Location
        Write-Success "Dependencias de Mobile instaladas."
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " [ECHO] Aprovisionamiento de entorno completado con éxito. " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
