/**
 * Echo Mesh VPN Service
 * Red Virtual Privada P2P descentralizada para conectar dispositivos
 * a través de Internet (4G, Wi-Fi distintas, redes universitarias/hogareñas)
 * utilizando NAT Traversal (STUN), UDP Hole Punching y TURN Relays.
 */
import { Peer, DataConnection, MediaConnection } from 'peerjs';

export interface MeshPeer {
  nodeId: string;
  displayName: string;
  status: 'connecting' | 'connected' | 'disconnected';
  latencyMs?: number;
  connectionType?: 'DIRECT_UDP_P2P' | 'TURN_RELAY';
}

export interface MeshMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'TEXT' | 'VOICE_NOTE' | 'FILE';
  fileData?: {
    name: string;
    size: number;
    mimeType: string;
    base64Url: string;
  };
}

export class MeshVpnService {
  private peer: Peer | null = null;
  public myNodeId: string = '';
  public activeConnections: Map<string, DataConnection> = new Map();
  public activeCalls: Map<string, MediaConnection> = new Map();

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // Listeners
  private onMessageCallbacks: Set<(msg: MeshMessage) => void> = new Set();
  private onPeersChangeCallbacks: Set<(peers: MeshPeer[]) => void> = new Set();
  private onRemoteStreamCallbacks: Set<(stream: MediaStream) => void> = new Set();
  private onStatusChangeCallbacks: Set<(status: string) => void> = new Set();

  private isInitialized = false;

  constructor() {
    this.remoteStream = new MediaStream();
  }

  /**
   * Inicializa el nodo en la red virtual Echo Mesh VPN
   */
  public initNode(preferredName: string = 'echo-user'): Promise<string> {
    if (this.peer && !this.peer.destroyed) {
      return Promise.resolve(this.myNodeId);
    }

    return new Promise((resolve, reject) => {
      const sanitized = preferredName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'peer';
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const generatedId = `echo-vpn-${sanitized}-${randomSuffix}`;

      this.peer = new Peer(generatedId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            // Fallback TURN relay gratuito para CGNAT y firewalls estrictos (OpenRelay Project)
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject',
            },
          ],
        },
      });

      this.peer.on('open', (id) => {
        this.myNodeId = id;
        this.isInitialized = true;
        this.notifyStatus('🟢 Nodo Activo en la Red Virtual Echo Mesh');
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('call', async (call) => {
        // Responder automáticamente con audio/video si el usuario está listo
        const stream = await this.getLocalMedia(true, true);
        call.answer(stream);
        this.handleCallStream(call);
      });

      this.peer.on('error', (err) => {
        console.warn('Echo Mesh VPN Error:', err);
        this.notifyStatus(`⚠️ Error en nodo: ${err.type || 'Fallo de red'}`);
      });

      this.peer.on('disconnected', () => {
        this.notifyStatus('🟡 Reconectando a la red virtual...');
        this.peer?.reconnect();
      });
    });
  }

  /**
   * Conecta a otro dispositivo remoto en cualquier red a través de su Node ID
   */
  public async connectToPeer(remoteNodeId: string, myDisplayName: string): Promise<void> {
    if (!this.peer) {
      await this.initNode(myDisplayName);
    }
    const cleanId = remoteNodeId.trim();
    if (!cleanId || cleanId === this.myNodeId) return;

    this.notifyStatus(`Conectando túnel P2P con ${cleanId}...`);

    const conn = this.peer!.connect(cleanId, {
      reliable: true,
      metadata: { displayName: myDisplayName },
    });

    this.setupConnectionHandlers(conn);
  }

  /**
   * Inicia llamada de voz y video directa a través del túnel VPN
   */
  public async callPeer(remoteNodeId: string): Promise<void> {
    if (!this.peer) return;
    const cleanId = remoteNodeId.trim();
    const stream = await this.getLocalMedia(true, true);

    const call = this.peer.call(cleanId, stream);
    this.handleCallStream(call);
  }

  private handleIncomingConnection(conn: DataConnection) {
    this.setupConnectionHandlers(conn);
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      this.activeConnections.set(conn.peer, conn);
      this.notifyPeersChange();
      this.notifyStatus(`🟢 Túnel WebRTC P2P activo con ${conn.peer}`);
    });

    conn.on('data', (data: any) => {
      try {
        const msg: MeshMessage = data;
        this.onMessageCallbacks.forEach((cb) => cb(msg));
      } catch (e) {
        console.error('Error parseando mensaje en VPN Mesh:', e);
      }
    });

    conn.on('close', () => {
      this.activeConnections.delete(conn.peer);
      this.notifyPeersChange();
      this.notifyStatus(`Túnel cerrado con ${conn.peer}`);
    });

    conn.on('error', (err) => {
      console.warn('Error en conexión P2P:', err);
      this.activeConnections.delete(conn.peer);
      this.notifyPeersChange();
    });
  }

  private handleCallStream(call: MediaConnection) {
    this.activeCalls.set(call.peer, call);

    call.on('stream', (remoteMediaStream) => {
      this.remoteStream = remoteMediaStream;
      this.onRemoteStreamCallbacks.forEach((cb) => cb(remoteMediaStream));
    });

    call.on('close', () => {
      this.activeCalls.delete(call.peer);
    });
  }

  /**
   * Envía un mensaje directo o archivo a todos los nodos conectados o a uno en específico
   */
  public sendMessage(
    content: string,
    senderName: string,
    targetPeerId?: string,
    fileData?: MeshMessage['fileData']
  ): MeshMessage | null {
    const msg: MeshMessage = {
      id: `vpn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderId: this.myNodeId,
      senderName,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: fileData ? 'FILE' : 'TEXT',
      fileData,
    };

    if (targetPeerId && this.activeConnections.has(targetPeerId)) {
      this.activeConnections.get(targetPeerId)?.send(msg);
    } else {
      // Enviar a todos los nodos del túnel
      this.activeConnections.forEach((conn) => {
        if (conn.open) {
          conn.send(msg);
        }
      });
    }

    return msg;
  }

  /**
   * Media & Audio
   */
  public async getLocalMedia(video: boolean = true, audio: boolean = true): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
    } catch {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    return this.localStream;
  }

  public async startScreenShare(): Promise<MediaStream> {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 60 } } as any,
      audio: true,
    });
    return screenStream;
  }

  public setMicEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    }
  }

  public setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    }
  }

  /**
   * Event Subscriptions
   */
  public onMessage(cb: (msg: MeshMessage) => void) {
    this.onMessageCallbacks.add(cb);
    return () => this.onMessageCallbacks.delete(cb);
  }

  public onPeersChange(cb: (peers: MeshPeer[]) => void) {
    this.onPeersChangeCallbacks.add(cb);
    return () => this.onPeersChangeCallbacks.delete(cb);
  }

  public onRemoteStream(cb: (stream: MediaStream) => void) {
    this.onRemoteStreamCallbacks.add(cb);
    return () => this.onRemoteStreamCallbacks.delete(cb);
  }

  public onStatusChange(cb: (status: string) => void) {
    this.onStatusChangeCallbacks.add(cb);
    return () => this.onStatusChangeCallbacks.delete(cb);
  }

  private notifyPeersChange() {
    const list: MeshPeer[] = Array.from(this.activeConnections.values()).map((c) => ({
      nodeId: c.peer,
      displayName: (c.metadata as any)?.displayName || c.peer,
      status: c.open ? 'connected' : 'connecting',
      connectionType: 'DIRECT_UDP_P2P',
    }));
    this.onPeersChangeCallbacks.forEach((cb) => cb(list));
  }

  private notifyStatus(status: string) {
    this.onStatusChangeCallbacks.forEach((cb) => cb(status));
  }

  public destroy() {
    this.activeConnections.forEach((c) => c.close());
    this.activeCalls.forEach((c) => c.close());
    this.activeConnections.clear();
    this.activeCalls.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.isInitialized = false;
  }
}

export const meshVpn = new MeshVpnService();
