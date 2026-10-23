# Echo — Módulo Backend & Señalización (FastAPI)

Este directorio contiene el backend completo de **Echo**, implementado con **Python 3.11+**, **FastAPI**, **SQLAlchemy (AsyncIO)**, **WebSockets nativos**, **Redis**, **MinIO S3** y el servicio de tokens SFU para **LiveKit WebRTC**.

---

## 1. Estructura de Archivos del Backend

```
backend/
├── config.py                 # Configuración del sistema y variables de entorno
├── database.py               # Motor de base de datos async (SQL Server / SQLite)
├── main.py                   # Punto de entrada de FastAPI, CORS y ciclo de vida
├── models.py                 # Modelos ORM relacionales (9 tablas T-SQL)
├── requirements.txt          # Dependencias de Python del proyecto
├── routes/
│   ├── auth.py               # Endpoints de autenticación, Auto-Login y QR Login
│   ├── servers.py            # Gestión de servidores, canales, mensajes y WebSockets
│   └── users.py              # Perfiles de usuario, avatares y configuración
├── services/
│   ├── livekit_service.py    # Generador de tokens JWT para voz/video LiveKit SFU
│   ├── redis_client.py       # Presencia en tiempo real (con fallback en memoria)
│   └── storage.py            # Almacenamiento MinIO S3 (con fallback a disco local)
├── tests/
│   └── test_api.py           # Suite de pruebas unitarias y de integración
└── uploads/                  # Directorio de archivos locales (notas Opus, avatares, APK)
```

---

## 2. Detalle y Funcionamiento Archivo por Archivo

### `main.py`
* **Propósito:** Inicializador de la aplicación FastAPI.
* **Ciclo de Vida (`lifespan`):**
  1. Conecta con Redis (o inicializa el diccionario TTL en memoria si Redis no está activo).
  2. Inicializa el cliente de almacenamiento MinIO (o crea la carpeta local `backend/uploads/` si MinIO no está disponible).
  3. Ejecuta `init_db()` para crear automáticamente todas las tablas relacionales.
* **Configuración de CORS:** Configura `CORSMiddleware` con `allow_credentials=True`, soportando `http://localhost:5173`, Tauri (`tauri://localhost`) y acceso LAN mediante regex reflectivo (`r"https?://.*"`).
* **Archivos Estáticos:** Monta el directorio `/uploads` para servir avatares, notas de voz, stickers y el binario `echo-app.apk`.

### `config.py`
* **Propósito:** Gestión centralizada de configuraciones mediante Pydantic `BaseSettings`.
* **Variables Clave:**
  - `DATABASE_URL`: Cadena de conexión ODBC para Microsoft SQL Server (o SQLite local `sqlite+aiosqlite:///./echo.db`).
  - `REDIS_HOST`, `REDIS_PORT`: Parámetros de conexión al servidor de presencia.
  - `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`: Parámetros S3.
  - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`: Claves del SFU de WebRTC.
  - `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`: Firma criptográfica de tokens.

### `database.py`
* **Propósito:** Manejador asíncrono de base de datos relacional.
* **Mecanismo de Resiliencia:** Intenta conectar a Microsoft SQL Server utilizando `aioodbc` o `pyodbc`. Si el motor SQL Server no está instalado o en ejecución, conmuta de forma automática e instantánea a un motor local SQLite (`aiosqlite`) garantizando cero errores de arranque (*Zero-Touch Execution*).

### `models.py`
* **Propósito:** Declaración de las 9 tablas relacionales del sistema utilizando SQLAlchemy 2.0:
  1. `Users`: Identidad dual (`Username` único en minúsculas y `DisplayName` visible), contraseña cifrada bcrypt, estado y avatar.
  2. `TrustedDevices`: Huella `HardwareID`, nombre del equipo, plataforma (`PC_DESKTOP`, `ANDROID_PHONE`, etc.), refresh tokens y flag `IsPrimaryOwner`.
  3. `Servers`: Servidores (grupos) privados, icono y propietario (`OwnerID`).
  4. `ServerMembers`: Relación N:M entre usuarios y servidores con fecha de ingreso.
  5. `Channels`: Canales de texto (`TEXT`) o salas de voz/video (`VOICE`).
  6. `Roles`: Sistema de roles con color hexadecimal, orden jerárquico y máscara de permisos bitwise (`Permissions` como `BIGINT`).
  7. `MemberRoles`: Asignación de roles a miembros específicos.
  8. `Messages`: Mensajes de chat, referencias de hilo, adjuntos, y muestras JSON de forma de onda Opus (`WaveformSamples`).
  9. `CustomEmojis`: Emojis y stickers personalizados en WebP con indicador `IsAnimated`.

### `routes/auth.py`
* **Propósito:** Autenticación de usuarios y dispositivos.
* **Endpoints:**
  - `POST /auth/register`: Registro de nuevas cuentas con validación de unicidad de `Username`.
  - `POST /auth/login`: Autenticación con contraseña, registro de dispositivo habitual y generación de JWTs.
  - `POST /auth/auto-login`: Reconocimiento automático de equipo por `HardwareID` (omite pantalla de login).
  - `POST /auth/qr/scan`: El teléfono móvil notifica al servidor el escaneo del código QR.
  - `POST /auth/qr/approve`: El teléfono móvil aprueba la sesión de la PC e inyecta las credenciales por WebSocket.

### `routes/servers.py`
* **Propósito:** Mensajería, canales y WebSockets de tiempo real.
* **Endpoints REST:**
  - `GET /servers`: Lista de servidores donde el usuario es miembro.
  - `POST /servers`: Creación de un nuevo servidor con canal `#general` automático.
  - `GET /servers/{id}/channels`: Canales de texto y voz del servidor.
  - `POST /channels/{id}/messages`: Envío de mensajes de texto o notas de voz Opus (con cálculo automático de 40 muestras de amplitud).
* **Servidores WebSocket:**
  - `/ws/chat/{channel_id}`: Transmisión en tiempo real de mensajes, eventos de escritura (*typing*) y confirmación de entrega con deduplicación por `MessageID`.
  - `/ws/presence`: Conexión de estado de presencia (`online`, `idle`, `dnd`, `offline`) e icono de plataforma del dispositivo.
  - `/ws/qr-login`: Canal bidireccional entre la PC y el servidor para el protocolo de inicio de sesión con código QR efímero.

### `routes/users.py`
* **Propósito:** Gestión de perfiles, avatares y listado de dispositivos confiables (`/users/me`, `/users/{id}`, `/users/me/devices`).

### `services/livekit_service.py`
* **Propósito:** Generador de tokens WebRTC LiveKit.
* **Funcionamiento:** Construye un `AccessToken` criptográfico que otorga permisos para unirse a una sala específica (`room_name`), publicar audio/video y suscribirse a streams de otros participantes a 60 FPS.

### `services/storage.py`
* **Propósito:** Capa de abstracción de almacenamiento de archivos multimedia.
* **Mecanismo:** Sube archivos a MinIO S3 si está disponible; de lo contrario, guarda los archivos en la ruta local `backend/uploads/` y genera URLs estáticas accesibles vía HTTP.

### `services/redis_client.py`
* **Propósito:** Gestión de sesiones efímeras y presencia.
* **Mecanismo:** Administra claves con TTL en Redis para tokens QR y estados de presencia. En caso de ausencia de Redis, utiliza un gestor de caché concurrente en memoria con expiración por hilos.

### `tests/test_api.py`
* **Propósito:** Pruebas automatizadas de integración.
* **Cobertura:**
  1. Operaciones a nivel de bits de la máscara de permisos (`PermissionFlags`).
  2. Generación matemática de las 40 muestras de forma de onda Opus.
  3. Creación y validación de tokens LiveKit SFU.
  4. Flujo completo de registro, inicio de sesión, auto-login por HardwareID, creación de canales y mensajería.

---

## 3. Ejecución de Pruebas Automatizadas

Para ejecutar la suite de pruebas unitarias y de integración del backend:

```powershell
cd r:\Usuarios\Adm01\Desktop\Echo\backend
.\.venv\Scripts\Activate.ps1
pytest tests/test_api.py -v
```
