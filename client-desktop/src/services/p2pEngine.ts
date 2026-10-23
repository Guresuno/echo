/**
 * Echo P2P Direct WebRTC Engine
 * Permite llamadas de voz/video y mensajería directa (DMs) punto a punto (Peer-to-Peer)
 * 100% independiente de servidores centrales, SFU o bases de datos.
 * Funciona sobre red local (LAN) e Internet mediante STUN y candidatos host ICE.
 */

export interface P2PMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'TEXT' | 'VOICE_NOTE' | 'EMOJI';
}

export type P2PConnectionState =
  | 'DISCONNECTED'
  | 'GENERATING_OFFER'
  | 'WAITING_FOR_ANSWER'
  | 'GENERATING_ANSWER'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'FAILED';

export class P2PEngine {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private onMessageCallback: ((msg: P2PMessage) => void) | null = null;
  private onStateChangeCallback: ((state: P2PConnectionState) => void) | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;

  public state: P2PConnectionState = 'DISCONNECTED';

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor() {
    this.remoteStream = new MediaStream();
  }

  public setOnMessage(cb: (msg: P2PMessage) => void) {
    this.onMessageCallback = cb;
  }

  public setOnStateChange(cb: (state: P2PConnectionState) => void) {
    this.onStateChangeCallback = cb;
  }

  public setOnRemoteStream(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = cb;
  }

  private setState(newState: P2PConnectionState) {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  /**
   * Obtiene la cámara y micrófono local
   */
  public async getLocalMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
      return this.localStream;
    } catch (e) {
      console.warn('No se pudo acceder a video/audio completo, intentando solo audio:', e);
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      return this.localStream;
    }
  }

  /**
   * Compartir pantalla a 60 FPS
   */
  public async startScreenShare(): Promise<MediaStream> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 60 } } as any,
      audio: true,
    });

    if (this.pc) {
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      } else {
        this.pc.addTrack(videoTrack, screenStream);
      }
    }

    return screenStream;
  }

  /**
   * Crea una nueva conexión RTCPeerConnection y añade tracks locales
   */
  private setupPeerConnection() {
    this.cleanup();
    this.remoteStream = new MediaStream();

    this.pc = new RTCPeerConnection(this.rtcConfig);

    // Adjuntar stream local si existe
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc?.addTrack(track, this.localStream!);
      });
    }

    // Recibir streams remotos de voz y video
    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      if (this.onRemoteStreamCallback && this.remoteStream) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc) {
        if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
          this.setState('CONNECTED');
        } else if (this.pc.iceConnectionState === 'failed' || this.pc.iceConnectionState === 'disconnected') {
          this.setState('FAILED');
        }
      }
    };
  }

  /**
   * MODO ANFITRIÓN (Paso 1): Genera la Oferta SDP con ICE Candidates empaquetados
   */
  public async createOffer(): Promise<string> {
    this.setState('GENERATING_OFFER');
    await this.getLocalMedia(true, true);
    this.setupPeerConnection();

    if (!this.pc) throw new Error('No se pudo inicializar RTCPeerConnection');

    // Crear DataChannel para DMs
    this.dataChannel = this.pc.createDataChannel('echo-p2p-dm', {
      ordered: true,
    });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Esperar a que se recopilen los candidatos ICE locales
    await this.waitForIceGathering(this.pc);

    this.setState('WAITING_FOR_ANSWER');
    return this.compressToken(this.pc.localDescription!);
  }

  /**
   * MODO INVITADO (Paso 2): Recibe la oferta del anfitrión y genera la respuesta (Answer)
   */
  public async handleOfferAndCreateAnswer(offerToken: string): Promise<string> {
    this.setState('GENERATING_ANSWER');
    await this.getLocalMedia(true, true);
    this.setupPeerConnection();

    if (!this.pc) throw new Error('No se pudo inicializar RTCPeerConnection');

    // Escuchar dataChannel del anfitrión
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    const offerDesc = this.decompressToken(offerToken);
    await this.pc.setRemoteDescription(new RTCSessionDescription(offerDesc));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await this.waitForIceGathering(this.pc);

    this.setState('CONNECTING');
    return this.compressToken(this.pc.localDescription!);
  }

  /**
   * MODO ANFITRIÓN (Paso 3): Recibe la respuesta del invitado para completar el handshake
   */
  public async applyAnswer(answerToken: string): Promise<void> {
    if (!this.pc) throw new Error('Conexión no iniciada');
    this.setState('CONNECTING');

    const answerDesc = this.decompressToken(answerToken);
    await this.pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
  }

  /**
   * Configuración de eventos del DataChannel para mensajes directos P2P
   */
  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      this.setState('CONNECTED');
    };

    channel.onmessage = (event) => {
      try {
        const msg: P2PMessage = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(msg);
        }
      } catch (err) {
        console.error('Error parseando mensaje P2P:', err);
      }
    };

    channel.onerror = (err) => {
      console.warn('Error en DataChannel P2P:', err);
    };
  }

  /**
   * Enviar un mensaje de chat directo por P2P (RTCDataChannel)
   */
  public sendDirectMessage(content: string, senderName: string, type: 'TEXT' | 'VOICE_NOTE' | 'EMOJI' = 'TEXT'): P2PMessage | null {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('DataChannel no está abierto');
      return null;
    }

    const msg: P2PMessage = {
      id: `p2p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderName,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
    };

    this.dataChannel.send(JSON.stringify(msg));
    return msg;
  }

  /**
   * Controles de audio y video
   */
  public setMicEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Espera a que se recolecten todos los candidatos ICE para exportar un único token
   */
  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        // Timeout de seguridad en caso de red aislada/sin internet (máx 2.5s)
        setTimeout(() => {
          resolve();
        }, 2500);
      }
    });
  }

  /**
   * Serializa y comprime la descripción SDP a un código Base64 transportable
   */
  private compressToken(desc: RTCSessionDescriptionInit): string {
    const json = JSON.stringify(desc);
    return btoa(unescape(encodeURIComponent(json)));
  }

  /**
   * Deserializa el código Base64
   */
  private decompressToken(token: string): RTCSessionDescriptionInit {
    const json = decodeURIComponent(escape(atob(token.trim())));
    return JSON.parse(json);
  }

  /**
   * Cierra streams y conexiones activas
   */
  public cleanup() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.setState('DISCONNECTED');
  }
}

export const p2pEngine = new P2PEngine();
