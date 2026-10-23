# Echo — Plataforma Privada de Comunicación en Tiempo Real

[![CI / CD Build Artifacts](https://github.com/Guresuno/echo/actions/workflows/release.yml/badge.svg)](https://github.com/Guresuno/echo/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg?logo=react)](https://react.dev)
[![Tauri](https://img.shields.io/badge/Tauri-1.6.0-24C8D8.svg?logo=tauri)](https://tauri.app)
[![Expo](https://img.shields.io/badge/Expo-Prebuild_51-000020.svg?logo=expo)](https://expo.dev)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC_SFU-FF0055.svg)](https://livekit.io)

**Echo** es una plataforma de comunicación privada de última generación inspirada en Discord, construida con arquitectura multi-dispositivo (Escritorio, Web y Móvil nativo). Integra canales de texto con notas de voz Opus y forma de onda interactiva, salas de voz y video en alta definición con compartición de pantalla a 60 FPS (LiveKit SFU), inicio de sesión con código QR y reconocimiento de hardware, permisos bitwise en microsegundos y un estudio de animación cuadro por cuadro acelerado por GPU.

---

## 1. Características Principales

| Módulo | Descripción | Tecnología |
| :--- | :--- | :--- |
| **Identidad Dual** | `@username` único para login y menciones vs `DisplayName` de libre edición con emojis | FastAPI + SQL Relacional |
| **Auto-Login Zero-Click** | Huella `HardwareID` (UUID Placa / AndroidId) que omite el login en dispositivos habituales | `TrustedDevices` + Vault Local |
| **Inicio de Sesión QR** | Escaneo desde el teléfono con `expo-camera` para autorizar la sesión en la PC sin escribir contraseña | WebSockets `/ws/qr-login` |
| **Voz, Video y Pantalla** | Salas de audio y video de baja latencia con pantalla compartida a 60 FPS y audio del sistema | LiveKit SFU + Coturn STUN/TURN |
| **Notas de Voz Opus** | Grabación en Opus 48 kHz con generación de 40 muestras de amplitud y reproductor con *seek* interactivo | HTML5 Audio + FFmpeg + Web Audio API |
| **Permisos Bitwise** | Matriz de 10 permisos de seguridad evaluados en microsegundos sobre columnas `BIGINT` | Bitmask 64-bit |
| **Estudio de Animación** | Dibujo cuadro por cuadro con sensibilidad a presión, papel cebolla y borde blanco troquelado | Canvas 2D + Shopify Skia GPU |
| **Modo P2P Directo (Offline)** | Llamadas de voz/video y DMs punto a punto (WebRTC DataChannel) cuando el servidor está desconectado | WebRTC Nativo + STUN Serverless |
| **Hospedaje Local (LAN)** | Lanzamiento en 1-clic con detección automática de IP para conectar celulares y PCs en la misma Wi-Fi | FastAPI + Vite (`start-pc.bat`) |
| **Diseño Responsivo** | Menú desplegable (*slide-over drawer*) con botón hamburguesa adaptado a pantallas móviles verticales | TailwindCSS + React |
| **Multiplataforma** | Cliente Desktop Windows nativo (.exe), Web SPA y Cliente Móvil Android nativo (.apk) | Tauri (Rust) + React Native Prebuild |

---

## 2. Estructura del Repositorio

```
Echo/
├── .github/
│   └── workflows/
│       └── release.yml        # CI/CD automatizado: compila y publica APK, EXE e IPA
├── backend/                   # API REST y Servidores WebSockets (FastAPI)
│   ├── routes/                # Controladores de Auth, Servidores, Canales y Usuarios
│   ├── services/              # Integración de LiveKit SFU, MinIO S3 y Redis
│   ├── models.py              # Definición de 9 tablas relacionales (SQL Server / SQLite)
│   └── README.md              # Documentación técnica completa del backend
├── client-desktop/            # Cliente Desktop Windows (Tauri) y Web (Vite + React)
│   ├── src/components/        # Componentes UI (Chat, Video, Sidebar, Estudio Skia, etc.)
│   ├── src-tauri/             # Backend nativo en Rust para Windows
│   └── README.md              # Documentación técnica del cliente de escritorio
├── client-mobile/             # Cliente Móvil Nativo para Android & iOS (Expo Prebuild)
│   ├── android/               # Proyecto nativo Gradle independiente (sin Expo Go)
│   ├── src/components/        # Componentes móviles (Lector QR con cámara, Canvas Skia)
│   └── README.md              # Documentación técnica del cliente móvil
├── docs/
│   └── ARCHITECTURE.md        # Especificación profunda de diagramas, flujos y protocolos
├── build-android-apk.ps1      # Compilador desatendido del APK nativo de Android
├── setup-environment.ps1      # Aprovisionamiento e instalación automática de herramientas
├── setup-environment.sh       # Script de aprovisionamiento para Linux / macOS
├── start-pc.bat               # Lanzador con un doble clic del backend y frontend
├── start-pc.ps1               # Lanzador PowerShell del entorno completo de PC
├── docker-compose.yml         # Contenedores para LiveKit, Coturn, Redis y MinIO
├── .gitignore                 # Reglas de exclusión para control de versiones limpio
└── README.md                  # Este documento
```

---

## 3. Documentación Técnica Detallada

Cada sub-módulo cuenta con su propio archivo de documentación que describe cómo funciona cada archivo individualmente:

* 📖 **[Arquitectura Global y Protocolos](docs/ARCHITECTURE.md):** Diagramas de secuencia de Auto-Login, QR Login, SFU WebRTC y matriz de permisos bitwise.
* 📖 **[Hospedaje Local y Modo P2P Directo](docs/LOCAL_HOSTING_AND_P2P.md):** Guía completa para correr Echo en tu PC/Wi-Fi y cómo funcionan las llamadas y mensajes P2P sin servidor.
* 📖 **[Documentación del Backend (FastAPI)](backend/README.md):** Explicación de endpoints, WebSockets, base de datos y servicios.
* 📖 **[Documentación del Cliente Desktop (Tauri)](client-desktop/README.md):** Explicación de componentes React, manejo de estado y empaquetado `.exe`.
* 📖 **[Documentación del Cliente Móvil (React Native)](client-mobile/README.md):** Explicación de la compilación nativa en Android/iOS, Skia y cámara.

---

## 4. Puesta en Marcha Rápida (Zero-Touch Provisioning)

### Paso 1: Aprovisionamiento Automático
Si clonas este repositorio en una máquina nueva, ejecuta el script maestro para instalar y configurar automáticamente Node.js, Python, Rust, Android SDK, OpenJDK 17 y FFmpeg:

```powershell
# En Windows (PowerShell con permisos de Administrador):
.\setup-environment.ps1
```

### Paso 2: Iniciar Servidores en PC
Para levantar el servidor backend de FastAPI (puerto 8000) y el frontend de Vite (puerto 5173):

```cmd
# Haz doble clic en start-pc.bat o ejecuta:
.\start-pc.bat
```

Una vez iniciados los servicios:
* **Interfaz Web / Desktop:** [http://localhost:5173](http://localhost:5173) (o `http://<TU_IP_LOCAL>:5173` desde cualquier equipo de tu red Wi-Fi).
* **Documentación Interactiva Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 5. Descarga de Aplicaciones y Control de Versiones

### 📱 Android (`.apk`)
1. **Descarga Directa desde la red local:**
   Conecta tu teléfono a la misma red Wi-Fi y abre en Chrome:
   `http://192.168.10.213:8000/uploads/echo-app.apk`
2. **Compilar manualmente un nuevo APK:**
   ```powershell
   .\build-android-apk.ps1 -Release -SkipPrebuild
   ```
3. **Descarga desde GitHub Releases:**
   Cada tag o versión publicada en este repositorio genera automáticamente el APK listo para descargar desde la pestaña **Releases**.

### 💻 Windows (`.exe` / `.msi`)
1. **Compilar la app nativa con Tauri:**
   ```powershell
   cd client-desktop
   npm run tauri build
   ```
2. El instalador generado estará en: `client-desktop/src-tauri/target/release/bundle/msi/`.

### 🍏 iOS (`.ipa`)
1. Generar proyecto nativo: `cd client-mobile && npx expo prebuild --platform ios`.
2. Compilar mediante Xcode en macOS o utilizando los corredores de GitHub Actions con macOS.

---

## 6. Publicación y Actualizaciones de Versiones en GitHub

Para publicar una nueva versión con binarios descargables automáticos:

1. Crea un commit con tus cambios:
   ```bash
   git add .
   git commit -m "feat: actualización de versión v1.0.0"
   ```
2. Crea una etiqueta de versión (*tag*) y súbela:
   ```bash
   git tag v1.0.0
   git push origin main --tags
   ```
3. La acción automatizada de GitHub (**GitHub Actions**) compilará los artefactos y los adjuntará automáticamente a la página de **Releases** para que cualquier usuario pueda descargarlos con un solo clic.

---

## 7. Licencia

Este proyecto está distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.
