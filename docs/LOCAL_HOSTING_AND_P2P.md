# Guía de Hospedaje Local (Self-Hosting) y Modo P2P Directo (Sin Servidor)

Esta guía explica en detalle cómo hospedar **Echo** en tu propia computadora o red local (LAN/Wi-Fi) y cómo funciona el **Modo P2P Directo (Peer-to-Peer)** para realizar **llamadas de voz/video y enviar mensajes directos (DMs) incluso si el servidor central está completamente apagado o desconectado**.

---

## 1. Hospedar Echo Localmente (En tu PC / Red Hogareña)

Echo está diseñado con una arquitectura **Zero-Configuration** capaz de funcionar en dos modalidades según los recursos de tu equipo:

### Modo A: Standalone Ligero (Recomendado para PC Hogareña, Sin Docker)
En este modo, Echo no requiere Docker ni servicios externos:
* **Base de Datos:** SQLite local integrado (`backend/echo.db`).
* **Presencia y Sesiones:** Fallback en memoria RAM con expiración TTL automática.
* **Archivos y Notas de Voz:** Almacenamiento local en disco (`backend/uploads/`).
* **Llamadas y Video:** Fallback directo WebRTC P2P integrado.

#### ¿Cómo iniciarlo con un solo clic?
1. Haz doble clic en el archivo **`start-pc.bat`** (o ejecuta `.\start-pc.ps1` en PowerShell).
2. El script detectará automáticamente la dirección IP de tu red Wi-Fi o Ethernet (ejemplo: `192.168.1.45`).
3. Se abrirán automáticamente dos ventanas:
   * **Backend:** En el puerto `8000` (`http://0.0.0.0:8000`).
   * **Cliente Web/Desktop:** En el puerto `5173` (`http://0.0.0.0:5173`).
4. **Para conectar otros dispositivos de tu casa (celulares, tablets u otras PCs):**
   * Abre el navegador en el otro dispositivo e ingresa a: `http://<TU_IP_LOCAL>:5173`
   * O descarga e instala el archivo nativo `.apk` en tu celular Android.

---

### Modo B: Infraestructura Completa con Docker (Para Servidores Dedicados)
Si dispones de Docker Desktop y deseas persistencia en Microsoft SQL Server, Redis y LiveKit SFU:
```bash
# 1. Levantar contenedores de infraestructura
docker compose -f docker/docker-compose.yml up -d

# 2. Iniciar Echo normalmente
start-pc.bat
```

---

## 2. Modo P2P Directo (Llamadas y Mensajes Sin Servidor)

Una de las características más potentes de Echo es su resiliencia ante caídas de servidor o cortes de conectividad central:

> [!IMPORTANT]
> **Si el servidor central se apaga, se cae o se queda sin luz, Echo NO deja de funcionar.** Los usuarios pueden activar el **Modo P2P Directo** para comunicarse de equipo a equipo sin intermediarios.

```
       CON SERVIDOR CENTRAL (Normal)
[PC / Móvil A] <─── WebSocket / SFU ───> [Servidor Echo] <─── WebSocket / SFU ───> [PC / Móvil B]

       MODO P2P DIRECTO (Servidor Caído / Desconectado)
[PC / Móvil A] <═══════════ WebRTC Direct DataChannel + MediaStream ════════════> [PC / Móvil B]
                                 (Cero Servidores Requeridos)
```

---

### ¿Cómo funciona la arquitectura P2P?

1. **Mensajes Directos (DMs) por `RTCDataChannel`:**
   * Los mensajes de texto, reacciones y notas de voz viajan encapsulados en paquetes SCTP encriptados directamente entre ambas máquinas.
   * Cero registros en bases de datos centralizadas; máxima privacidad y latencia sub-10ms en red local.
2. **Llamadas de Voz y Video por `RTCPeerConnection`:**
   * Utiliza el códec Opus a 48 kHz para audio cristalino con cancelación de eco y supresión de ruido.
   * Transmisión de cámara HD y **pantalla compartida a 60 FPS**.
3. **Señalización Serverless (Intercambio de Oferta/Respuesta):**
   * Debido a que no hay servidor central para negociar la sesión SDP, Echo empaqueta la oferta en un **código de invitación Base64** y un **Código QR**.

---

### Guía Paso a Paso para Usar el Modo P2P

#### Paso 1: Abrir el Modo P2P
Puedes abrir la ventana P2P de tres formas:
1. **Desde la pantalla de Login:** Pulsando el botón verde *"Modo P2P Directo (Llamadas y Chat Sin Servidor)"*.
2. **Desde la barra lateral:** Haciendo clic en el icono de antena (`Radio`) en el riel de servidores.
3. **Banner de desconexión:** Si el servidor se apaga mientras usas la app, aparecerá una alerta amarilla arriba con el botón *"Abrir P2P Directo"*.

#### Paso 2: El Anfitrión (Persona A) crea la sala
1. En la pestaña **"1. Crear Sala (Anfitrión)"**, pulsa **"Generar Código de Conexión P2P"**.
2. Copia el código generado (o muestra el Código QR en pantalla).
3. Envía ese código a tu amigo (por WhatsApp, Telegram, correo o mostrándole el QR en persona).

#### Paso 3: El Invitado (Persona B) se une
1. Abre Echo y ve a la pestaña **"2. Unirse a Sala (Invitado)"**.
2. Pega el código que te envió el Anfitrión y pulsa **"Generar Mi Código de Respuesta"**.
3. Copia el código de respuesta generado y devuélveselo al Anfitrión.

#### Paso 4: Conexión Instantánea
1. El Anfitrión pega la respuesta en su ventana y pulsa **"Conectar y Comenzar Llamada P2P"**.
2. **¡Listo!** El estado cambiará a `🟢 Conectado P2P En Vivo`. Se activarán automáticamente los videos en pantalla completa, los controles de micrófono, cámara, pantalla compartida y el chat directo.

---

## 3. Matriz de Comparación: Servidor Central vs P2P Directo

| Característica | Servidor Central Echo | Modo P2P Directo |
| :--- | :--- | :--- |
| **Requiere PC Servidor encendida** | Sí | **No** (Completamente descentralizado) |
| **Llamadas de Voz y Video** | Sí (LiveKit SFU multiusuario) | **Sí** (WebRTC P2P 1-a-1 de alta fidelidad) |
| **Compartir Pantalla a 60 FPS** | Sí | **Sí** |
| **Mensajes Directos (DMs)** | Sí (Persistidos en SQL Server/SQLite) | **Sí** (Efímeros vía `RTCDataChannel`) |
| **Latencia en Red Local (LAN)** | ~5-15 ms | **< 3 ms** |
| **Privacidad / Cifrado** | TLS + Base de datos | **Punto a punto (End-to-End)** |
| **Funciona sin Internet (Aislado)**| Sí (en LAN) | **Sí** (en LAN o conexión directa) |
