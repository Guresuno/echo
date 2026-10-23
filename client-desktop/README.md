# Echo — Cliente Nativo Desktop & Web (Tauri + React + Vite)

Este directorio contiene el cliente de escritorio y web de **Echo**, construido con **Tauri (Rust)**, **React 18**, **TypeScript**, **Vite** y **TailwindCSS**.

---

## 1. Estructura de Archivos del Cliente Desktop

```
client-desktop/
├── package.json              # Dependencias de npm y scripts
├── vite.config.ts            # Configuración de Vite, proxy inverso y puertos
├── tailwind.config.js        # Paleta de colores dark theme estilo Discord
├── src/
│   ├── App.tsx               # Componente raíz, autenticación y menú responsivo
│   ├── main.tsx              # Montaje en el DOM
│   ├── index.css             # Estilos globales y utilidades de Tailwind
│   ├── components/
│   │   ├── AnimationStudio.tsx    # Estudio de animación 2D frame-by-frame
│   │   ├── ChatView.tsx           # Feed de mensajes, deduplicación y emojis
│   │   ├── DeviceStatusBadge.tsx  # Icono de plataforma (PC, Móvil, Tablet)
│   │   ├── QRLoginModal.tsx       # Modal de inicio de sesión con código QR
│   │   ├── ServerSidebar.tsx      # Barra lateral de servidores, canales y drawer
│   │   ├── VoiceNoteRecorder.tsx  # Grabador Opus y reproductor de ondas
│   │   └── VoiceVideoRoom.tsx     # Sala de voz, cámara y compartir pantalla SFU
│   └── services/
│       ├── hardwareId.ts     # Extracción de MachineGuid y UUID de placa base
│       └── livekit.ts        # Conexión al SFU de LiveKit WebRTC
└── src-tauri/
    ├── Cargo.toml            # Dependencias de Rust para la app nativa
    ├── tauri.conf.json       # Configuración de ventana, bundle e iconos
    └── src/
        └── main.rs           # Backend de Tauri en Rust (atajos globales, HWID)
```

---

## 2. Detalle y Funcionamiento Archivo por Archivo

### `src/App.tsx`
* **Propósito:** Núcleo de la interfaz de usuario.
* **Funciones:**
  - Gestiona el estado de autenticación (`currentUser`, `token`).
  - Al abrirse, extrae el `HardwareID` del equipo e intenta el **Zero-Click Auto-Login** con el backend.
  - Administra el estado activo del servidor y del canal seleccionado.
  - Controla la visibilidad del cajón lateral responsivo (`mobileDrawerOpen`) para pantallas pequeñas y móviles en vertical.
  - Dispone del selector multicuenta (*Account Switcher*) para alternar rápidamente entre usuarios guardados en el equipo.

### `src/components/ChatView.tsx`
* **Propósito:** Vista de canal de texto y mensajería en tiempo real.
* **Funciones:**
  - Establece conexión WebSocket persistente con reconexión automática a `/ws/chat/{channel_id}`.
  - **Deduplicación:** Filtra los ecos de mensajes mediante comparación estricta de `MessageID` para evitar mensajes duplicados en pantalla.
  - **Emojis Personalizados:** Detecta códigos `:shortcode:` y los renderiza como iconos integrados (22x22 px) o *Jumbomojis* (48x48 px si el mensaje contiene solo el emoji).
  - **Stickers:** Muestra stickers animados en gran resolución (hasta 512x512 px).
  - Incluye botón de menú hamburguesa (`☰`) en la cabecera visible exclusivamente en pantallas móviles.

### `src/components/VoiceVideoRoom.tsx`
* **Propósito:** Sala de voz, videollamadas y transmisión de pantalla mediante LiveKit SFU.
* **Funciones:**
  - Solicita un token criptográfico al backend (`POST /channels/{id}/voice-token`).
  - Conecta a la sala SFU y gestiona los tracks de audio y video de todos los participantes.
  - Soporta **compartir pantalla a 60 FPS** con audio del sistema integrado.
  - Dispone de controles para silenciar micrófono, activar cámara y desconectar.

### `src/components/ServerSidebar.tsx`
* **Propósito:** Navegación por servidores, canales y perfil de usuario.
* **Funciones:**
  - Lista de iconos de servidores en vertical.
  - Lista de canales de texto (`#`) y salas de voz/video (`🔊`).
  - Modal para creación de nuevos servidores y canales con selección de tipo.
  - **Comportamiento Móvil:** Opera como panel fijo en escritorio (`md:relative`) y como **cajón deslizante con fondo translúcido (drawer + backdrop)** en pantallas móviles para garantizar máxima legibilidad en vertical.

### `src/components/VoiceNoteRecorder.tsx`
* **Propósito:** Grabación y reproducción de notas de voz Opus.
* **Funciones:**
  - Utiliza `MediaRecorder` de HTML5 para capturar audio en Opus/WebM a 48 kHz.
  - Posee botones con `type="button"` para prevenir envíos accidentales de formulario al presionar `Enter` en el chat.
  - Muestra una onda interactiva de **40 barras de amplitud**: el usuario puede hacer clic en cualquier barra para desplazarse a ese punto del audio.
  - Permite cambiar la velocidad de reproducción (1.0x, 1.5x, 2.0x).

### `src/components/QRLoginModal.tsx`
* **Propósito:** Generador de código QR para inicio de sesión desde la app móvil.
* **Funciones:**
  - Conecta al WebSocket `/ws/qr-login` de FastAPI.
  - Renderiza el QR con esquema `miapp://qr-login/{qr_token}` y un temporizador de 120 segundos.
  - Al detectarse el escaneo en el teléfono, oculta el QR y muestra la foto y nombre del usuario.
  - Al recibir la confirmación de aprobación, almacena los tokens JWT y abre el chat automáticamente.

### `src/components/AnimationStudio.tsx`
* **Propósito:** Estudio integrado de animación cuadro por cuadro acelerado por GPU.
* **Funciones:**
  - Lienzo HTML5 Canvas con trazo suave mediante curvas Bezier y presión de lápiz óptico (`perfect-freehand`).
  - **Papel Cebolla (Onion Skinning):** Visualización semitransparente del fotograma anterior y posterior.
  - **Borde Blanco Troquelado:** Algoritmo de dilatación morfológica que crea un borde exterior blanco estilo calcomanía de mensajería.
  - Exportación de secuencias a WebP animado o paquete de stickers JSON.

### `src/components/DeviceStatusBadge.tsx`
* **Propósito:** Renderizado de badges de estado e indicador de dispositivo del usuario (`PC_DESKTOP`, `ANDROID_PHONE`, `IOS_PHONE`, `TABLET_IPAD`, `WEB_BROWSER`).

### `src/components/EmojiPicker.tsx` & `src/components/emojiData.ts`
* **Propósito:** Selector y buscador de emojis por defecto (estilo PiliApp y Discord) y stickers personalizados.
* **Funciones:**
  - **Catálogo Organizado:** Categorías completas (Caritas y Gestos, Animales y Naturaleza, Comida y Bebida, Actividades y Deportes, Objetos y Símbolos).
  - **Búsqueda Instantánea:** Búsqueda en tiempo real mediante palabras clave en español (ej. "risa", "corazon", "fuego", "dolar").
  - **Emojis Recientes:** Persistencia en `localStorage` de los últimos emojis utilizados para acceso veloz.
  - **Barra de Previsualización:** Muestra el emoji seleccionado en tamaño ampliado junto con su nombre descriptivo.
  - **Pestaña de Stickers:** Permite alternar entre emojis estándar Unicode y los stickers animados/personalizados del servidor.

### `src/services/hardwareId.ts`
* **Propósito:** Extracción de la huella digital única del dispositivo.
* **Mecanismo:** En Tauri, invoca comandos nativos de Rust para consultar el `MachineGuid` de Windows o el UUID de la placa madre. En el navegador web, genera un UUID criptográfico persistente en `localStorage`.

### `src-tauri/src/main.rs` & `src-tauri/tauri.conf.json`
* **Propósito:** Backend nativo de Rust para la aplicación de Windows.
* **Funciones:**
  - Registro de atajos globales del sistema (para *Push-to-Talk* incluso con la app minimizada o mientras se juega).
  - Configuración de la ventana sin bordes (frameless) con aceleración gráfica por WebView2.

---

## 3. Compilación a Binario Nativo de Windows (`.exe` / `.msi`)

Para compilar el ejecutable nativo de Windows utilizando Tauri y Cargo:

```powershell
cd r:\Usuarios\Adm01\Desktop\Echo\client-desktop
npm run tauri build
```

El instalador y ejecutable resultante se generará en:
`client-desktop/src-tauri/target/release/bundle/msi/`
