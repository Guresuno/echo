# Guía de Red Virtual VPN, Hospedaje y Conexión Multi-Red

Esta guía detalla cómo **Echo funciona como su propia Red Virtual Privada (Mesh VPN)** para conectar dispositivos que se encuentran en **redes completamente distintas** (por ejemplo: un teléfono en datos 4G/5G, una PC en la oficina y otra en casa con diferente Wi-Fi), sin necesidad de instalar programas VPN de terceros (como Hamachi, ZeroTier o Tailscale) ni abrir puertos en el router.

---

## 1. Conexión de Dispositivos en Distintas Redes

Echo ofrece dos soluciones integradas según la necesidad de comunicación:

| Necesidad | Solución Echo | Script o Función | ¿Requiere Router/Puertos? |
| :--- | :--- | :--- | :--- |
| **Llamadas y Chat P2P Directo por Internet** | **Echo Mesh VPN** (WebRTC UDP Hole Punching) | Dentro de la App (`P2P Directo`) | **No** (Cero configuración) |
| **Compartir el Servidor Echo Completo por Internet** | **Túnel Seguro Global** (Cloudflare Tunnel) | `start-global.bat` | **No** (Cero configuración) |
| **Uso exclusivo en la misma casa / oficina** | **Hospedaje Local LAN** | `start-pc.bat` | **No** (Solo Wi-Fi local) |

---

## 2. Echo Mesh VPN (Red Virtual P2P Integrada)

Echo incorpora un motor de red superpuesta (*overlay mesh network*) basado en WebRTC nativo y servidores STUN/TURN de alta disponibilidad (Google STUN + OpenRelay TURN Project).

```
                      INTERNET / DIFERENTES REDES
[Dispositivo A en Datos 4G/5G]                      [Dispositivo B en Wi-Fi Hogar]
       │                                                         │
       │─── STUN / UDP Hole Punching (Traspaso de NAT y CGNAT)───│
       │                                                         │
       ▼                                                         ▼
       ╔═════════════════════════════════════════════════════════╗
       ║   TÚNEL PRIVADO CIFRADO END-TO-END (Echo Mesh VPN)      ║
       ║  • Llamadas de Voz Opus 48 kHz                          ║
       ║  • Video HD y Pantalla Compartida a 60 FPS              ║
       ║  • Mensajes Directos (DMs) por RTCDataChannel           ║
       ║  • Envío de Archivos y Fotos P2P sin límite de tamaño   ║
       ╚═════════════════════════════════════════════════════════╝
```

### ¿Cómo conectar dos dispositivos en redes distintas?

1. Abre Echo en ambos dispositivos (PC, laptop, celular o navegador).
2. Haz clic en el botón de antena (`Radio`) en la barra lateral o en la pantalla de login: **"Modo P2P Directo"**.
3. En la pestaña **"1. Red Mesh Global (Por Internet / 4G / Cualquier Red)"**:
   * Cada dispositivo verá su propia dirección de red virtual:
     `echo-vpn-juan-4821` (puedes copiarla o abrir su Código QR).
4. El Dispositivo B simplemente escribe o pega el `Node ID` del Dispositivo A en el campo:
   * **"Pega el Node ID de tu amigo (ej: echo-vpn-juan-4821)"**
   * Pulsa **"Establecer Túnel P2P (UDP Hole Punching)"**.
5. **¡Conexión Instantánea!** En menos de un segundo ambos dispositivos traspasan los firewalls y NATs de sus respectivos proveedores de internet (Movistar, Claro, Vodafone, etc.), abriendo la videollamada, el chat privado y la transferencia de archivos directa.

---

## 3. Hospedar el Servidor Completo para Amigos en Internet (`start-global.bat`)

Si deseas encender tu servidor Echo local (con todos los canales de texto, canales de voz, roles, emojis personalizados y estudio de animación) y que tus amigos se conecten **desde sus casas o desde sus celulares en la calle con datos móviles**:

1. Haz doble clic en **`start-global.bat`** (o ejecuta `.\start-global.ps1` en PowerShell).
2. El script iniciará automáticamente:
   * El Backend FastAPI en `0.0.0.0:8000`.
   * El Cliente Vite en `0.0.0.0:5173`.
   * Un túnel seguro de grado empresarial (`cloudflared`) que no requiere cuenta, ni tarjeta, ni abrir puertos en tu router.
3. En la ventana **"Echo Global Tunnel"** verás una dirección pública segura como:
   `https://random-words.trycloudflare.com`
4. Pasa ese enlace a tus amigos: ellos podrán entrar desde cualquier parte del mundo desde su navegador o app móvil y unirse a tu servidor como si estuvieran en tu misma casa.

---

## 4. Hospedaje en Red Local / Hogar (`start-pc.bat`)

Si solo quieres usar Echo con tus familiares o compañeros conectados a la misma red Wi-Fi o cable Ethernet:
1. Haz doble clic en **`start-pc.bat`**.
2. El script detectará la IP de tu PC automáticamente (ej: `192.168.1.15`).
3. Tus familiares pueden entrar escribiendo: `http://192.168.1.15:5173` en su navegador o celular.
4. Funciona en modo Standalone ligero con SQLite integrado (`backend/echo.db`), sin necesidad de Docker ni dependencias externas.

---

## 5. Resumen de Seguridad y Privacidad

* **Cero Filtración de Datos en Modo Mesh VPN:** Las comunicaciones directas no tocan ningún servidor central ni se registran en bases de datos.
* **Cifrado DTLS / SRTP:** El tráfico de voz, video y pantalla viaja encriptado de extremo a extremo con certificados criptográficos efímeros generados por cada dispositivo.
* **Resistencia a Bloqueos de Operadoras (CGNAT):** Al contar con fallback a TURN Relay por los puertos HTTPS estándar (`443` y `80`), la conexión funciona incluso en redes móviles restrictivas donde el P2P directo suele estar bloqueado.
