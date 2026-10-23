# Echo — Cliente Nativo Móvil (React Native + Expo Prebuild)

Este directorio contiene el cliente nativo para dispositivos móviles (**Android & iOS**) de **Echo**.

> [!IMPORTANT]
> **Sin dependencia de Expo Go:** Este proyecto utiliza **Expo Prebuild** (`npx expo prebuild --clean`) para generar código nativo directo en Java, Kotlin y C++. Esto permite acceso a librerías nativas de alto rendimiento como `@livekit/react-native-webrtc`, `@shopify/react-native-skia`, `expo-camera`, `expo-av` y `expo-secure-store`.

---

## 1. Estructura de Archivos del Cliente Móvil

```
client-mobile/
├── App.tsx                   # Punto de entrada de la aplicación móvil
├── app.json                  # Manifiesto Expo, plugins nativos y permisos
├── package.json              # Dependencias nativas y scripts de compilación
├── assets/                   # Iconos nativos, pantalla de inicio (splash) y adaptive icon
├── android/                  # Proyecto nativo de Android Studio generado por Prebuild
│   ├── app/build.gradle      # Configuración de empaquetado, NDK y firmas
│   ├── build.gradle          # Repositorios y versiones de Kotlin/Android
│   └── local.properties      # Ruta al Android SDK (R:\Android\Sdk)
└── src/
    ├── components/
    │   ├── DeviceStatusBadge.tsx    # Indicador de estado y tipo de plataforma
    │   ├── QRScannerModal.tsx       # Lector de cámara para aprobar QR de PC
    │   └── SkiaAnimationStudio.tsx  # Lienzo GPU Skia para animación 2D y stickers
    └── services/
        └── hardwareId.ts            # Extracción de AndroidId / iOS Vendor UUID
```

---

## 2. Detalle y Funcionamiento Archivo por Archivo

### `App.tsx`
* **Propósito:** Vista principal móvil y gestor de estado.
* **Funciones:**
  - Obtiene el identificador de hardware del teléfono (`AndroidId` en Android o `getIosIdForVendorAsync()` en iOS).
  - Envía la solicitud de **Zero-Click Auto-Login** al backend (`http://192.168.10.213:8000/auth/auto-login`). Si el teléfono ya es un dispositivo de confianza, entra directamente sin pedir clave.
  - Presenta la lista de canales y el chat interactivo adaptado para pantallas táctiles y teclado virtual con `KeyboardAvoidingView`.
  - Dispone de botones de acceso rápido para abrir el **Escáner QR** y el **Estudio de Animación Skia**.

### `app.json`
* **Propósito:** Configuración del proyecto nativo para Expo Prebuild.
* **Aspectos Destacados:**
  - Esquema de URI personalizado: `miapp://` (para manejar enlaces de escaneo de QR).
  - Configuración de plugins nativos: `expo-camera`, `expo-av`, `expo-secure-store`.
  - Permisos declarados de Android: `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `INTERNET`, `ACCESS_NETWORK_STATE`.
  - `minSdkVersion`: 24 (requerido para WebRTC de última generación).

### `src/components/QRScannerModal.tsx`
* **Propósito:** Lector de cámara con `expo-camera` para inicio de sesión en PC estilo Discord.
* **Flujo:**
  1. Abre la cámara y enfoca el código QR de la pantalla de la PC (`miapp://qr-login/{qr_token}`).
  2. Notifica al servidor mediante `POST /auth/qr/scan` que el código fue leído.
  3. Muestra una tarjeta de seguridad con el nombre de la PC y un switch para **"Registrar esta PC como mi dispositivo habitual (Auto-login)"**.
  4. Al pulsar **"Aprobar Inicio de Sesión"**, envía `POST /auth/qr/approve`, permitiendo el acceso en la PC de forma instantánea.

### `src/components/SkiaAnimationStudio.tsx`
* **Propósito:** Motor de animación 2D acelerado por hardware para pantallas táctiles y lápices ópticos.
* **Tecnología:** Utiliza `@shopify/react-native-skia` con renderizado nativo sobre Canvas C++.
* **Funciones:**
  - Dibuja trazos con grosor variable según la velocidad o presión del lápiz.
  - Soporte de múltiples capas (*layers*) y navegación de fotogramas clave (*timeline*).
  - Efecto de piel de cebolla (*Onion skin*) para dibujar con referencia al fotograma previo.
  - Exportación de stickers WebP listos para enviar en el chat.

### `src/services/hardwareId.ts`
* **Propósito:** Identificación única del dispositivo físico.
* **Implementación:**
  - En Android: Emplea `Application.getAndroidId()` provisto por el sistema operativo.
  - En iOS: Emplea `Application.getIosIdForVendorAsync()`.
  - En Web/Fallback: Genera un UUID v4 persistente en `AsyncStorage`.

---

## 3. Compilación del APK Nativo de Android

El script maestro [`build-android-apk.ps1`](file:///r:/Usuarios/Adm01/Desktop/Echo/build-android-apk.ps1) automatiza toda la generación y compilación:

```powershell
# Compilar APK Standalone en modo Release
.\build-android-apk.ps1 -Release -SkipPrebuild
```

### ¿Qué hace este script?
1. Configura automáticamente las variables de entorno `ANDROID_HOME`, `JAVA_HOME` y redirige `GRADLE_USER_HOME` al disco `R:\.gradle` para aprovechar más de 430 GB de espacio libre.
2. Genera el bundle JavaScript embebido (`index.android.bundle`) para que la app no dependa de ningún servidor Metro o PC encendida.
3. Compila los binarios C++ con CMake y los dos NDKs necesarios (`26.1.10909125` para WebRTC y `25.1.8937393` para Skia).
4. Firma el APK con la clave debug keystore para instalación sin fricción en cualquier teléfono.
5. Copia el archivo resultante a `backend/uploads/echo-app.apk` y `client-desktop/dist/echo-app.apk` para descarga inmediata por navegador web.

---

## 4. Guía de Compilación para iOS (`.ipa`)

Para compilar el binario nativo de iOS para iPhone o iPad:

1. **Generar proyecto de Xcode:**
   ```bash
   npx expo prebuild --platform ios --clean
   ```
2. **Instalar CocoaPods:**
   ```bash
   cd ios && pod install
   ```
3. **Compilar con Xcode o Fastlane:**
   - Abrir `ios/Echo.xcworkspace` en Xcode en macOS.
   - Seleccionar el dispositivo de destino o *Any iOS Device*.
   - Ir a **Product > Archive** y exportar como **Ad-Hoc / Development IPA** o subir a TestFlight.
