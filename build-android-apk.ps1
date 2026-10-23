# ==============================================================================
# ECHO - Compilador de APK Nativo Independiente para Android (Sin Expo Go)
# ==============================================================================
[CmdletBinding()]
param(
    [switch]$Release,
    [switch]$SkipPrebuild
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  [ECHO] Compilando APK Nativo de Android...             " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Configurar Entorno Android, Java & Gradle (Ubicando Gradle en Disco R con 430+ GB)
$env:ANDROID_HOME = "R:\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:GRADLE_USER_HOME = "R:\.gradle"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;" + $env:PATH
if (-not (Test-Path "R:\.gradle")) { New-Item -ItemType Directory -Path "R:\.gradle" -Force | Out-Null }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mobileDir = Join-Path $scriptDir "client-mobile"
$androidDir = Join-Path $mobileDir "android"

# 2. Generar Proyecto Nativo con Expo Prebuild (si no se omite)
if (-not $SkipPrebuild -or -not (Test-Path $androidDir)) {
    Write-Host "`n[1/3] Generando proyecto nativo Android con Expo Prebuild..." -ForegroundColor Yellow
    Set-Location $mobileDir
    cmd.exe /c npx expo prebuild --platform android --clean
}

# Asegurar local.properties con el path al SDK de Android
$localPropPath = Join-Path $androidDir "local.properties"
"sdk.dir=R\:\\Android\\Sdk" | Out-File -FilePath $localPropPath -Encoding ascii -Force

# 3. Compilar APK con Gradle
Set-Location $androidDir

if ($Release) {
    Write-Host "`n[2/3] Compilando APK Release (assembleRelease)..." -ForegroundColor Yellow
    cmd.exe /c gradlew.bat assembleRelease --no-daemon
    $apkPath = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
    if (-not (Test-Path $apkPath)) {
        $apkPath = Join-Path $androidDir "app\build\outputs\apk\release\app-release-unsigned.apk"
    }
} else {
    Write-Host "`n[2/3] Compilando APK Debug (assembleDebug)..." -ForegroundColor Yellow
    cmd.exe /c gradlew.bat assembleDebug --no-daemon
    $apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
}

if (Test-Path $apkPath) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "  [EXITO] APK compilado correctamente en:                 " -ForegroundColor Green
    Write-Host "  $apkPath" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green

    # 4. Copiar APK a las carpetas públicas para descarga directa
    Write-Host "`n[3/3] Publicando APK para descarga web..." -ForegroundColor Cyan
    $uploadsDir = Join-Path $scriptDir "backend\uploads"
    if (-not (Test-Path $uploadsDir)) { New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null }
    Copy-Item $apkPath -Destination (Join-Path $uploadsDir "echo-app.apk") -Force

    $distDir = Join-Path $scriptDir "client-desktop\dist"
    if (Test-Path $distDir) {
        Copy-Item $apkPath -Destination (Join-Path $distDir "echo-app.apk") -Force
    }

    Write-Host "  -> Disponible en: http://localhost:8000/uploads/echo-app.apk" -ForegroundColor Green
    Write-Host "  -> En red LAN:    http://192.168.10.213:8000/uploads/echo-app.apk" -ForegroundColor Green
} else {
    Write-Host "`nNo se encontro el archivo APK resultante." -ForegroundColor Red
}
