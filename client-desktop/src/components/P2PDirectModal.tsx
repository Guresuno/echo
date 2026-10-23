import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Copy,
  Check,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Send,
  Lock,
  Globe,
  Wifi,
  WifiOff,
  Paperclip,
  QrCode as QrIcon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { meshVpn, MeshPeer, MeshMessage } from '../services/meshVpnService';
import { p2pEngine, P2PConnectionState, P2PMessage } from '../services/p2pEngine';

interface P2PDirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName?: string;
}

export const P2PDirectModal: React.FC<P2PDirectModalProps> = ({
  isOpen,
  onClose,
  currentUserName = 'Usuario',
}) => {
  // Navigation tabs
  const [networkMode, setNetworkMode] = useState<'VPN_MESH' | 'OFFLINE_LAN'>('VPN_MESH');
  const [offlineSubTab, setOfflineSubTab] = useState<'HOST' | 'GUEST'>('HOST');

  // Mesh VPN State
  const [myNodeId, setMyNodeId] = useState<string>('');
  const [targetNodeId, setTargetNodeId] = useState<string>('');
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [vpnStatusText, setVpnStatusText] = useState<string>('Iniciando nodo virtual...');
  const [isVpnConnected, setIsVpnConnected] = useState<boolean>(false);

  // Manual Offline Engine State
  const [connectionState, setConnectionState] = useState<P2PConnectionState>('DISCONNECTED');
  const [offerToken, setOfferToken] = useState('');
  const [answerToken, setAnswerToken] = useState('');

  // Common UI State
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Array<{ id: string; senderName: string; content: string; timestamp: string }>>([]);
  const [inputText, setInputText] = useState('');

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Initialize Mesh VPN when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (networkMode === 'VPN_MESH') {
      meshVpn.initNode(currentUserName).then((id) => {
        setMyNodeId(id);
      });

      const unsubPeers = meshVpn.onPeersChange((p) => {
        setPeers(p);
        setIsVpnConnected(p.some((x) => x.status === 'connected'));
      });

      const unsubStatus = meshVpn.onStatusChange((s) => {
        setVpnStatusText(s);
      });

      const unsubMsg = meshVpn.onMessage((m) => {
        setMessages((prev) => [...prev, m]);
        setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      });

      const unsubStream = meshVpn.onRemoteStream((stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });

      bindLocalVideo();

      return () => {
        unsubPeers();
        unsubStatus();
        unsubMsg();
        unsubStream();
      };
    } else {
      // Offline mode listeners
      p2pEngine.setOnStateChange(setConnectionState);
      p2pEngine.setOnMessage((msg) => {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      });
      p2pEngine.setOnRemoteStream((stream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      });
    }
  }, [isOpen, networkMode]);

  const bindLocalVideo = async () => {
    try {
      const stream = await meshVpn.getLocalMedia(true, true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn('Error binding local video:', e);
    }
  };

  // VPN: Connect to remote node anywhere on the Internet
  const handleConnectMeshPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNodeId.trim()) return;
    try {
      await meshVpn.connectToPeer(targetNodeId.trim(), currentUserName);
      // Also establish voice/video call across the tunnel
      await meshVpn.callPeer(targetNodeId.trim());
    } catch (err: any) {
      alert(`Error conectando túnel P2P: ${err.message}`);
    }
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Media controls
  const toggleMic = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (networkMode === 'VPN_MESH') {
      meshVpn.setMicEnabled(!next);
    } else {
      p2pEngine.setMicEnabled(!next);
    }
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (networkMode === 'VPN_MESH') {
      meshVpn.setVideoEnabled(!next);
    } else {
      p2pEngine.setVideoEnabled(!next);
    }
  };

  const handleScreenShare = async () => {
    try {
      const stream =
        networkMode === 'VPN_MESH'
          ? await meshVpn.startScreenShare()
          : await p2pEngine.startScreenShare();
      setIsScreenSharing(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        bindLocalVideo();
      };
    } catch (e) {
      console.warn('Screen share canceled:', e);
    }
  };

  const handleHangUp = () => {
    if (networkMode === 'VPN_MESH') {
      meshVpn.destroy();
      setIsVpnConnected(false);
      setPeers([]);
    } else {
      p2pEngine.cleanup();
      setConnectionState('DISCONNECTED');
    }
    setMessages([]);
    onClose();
  };

  // Send Direct Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (networkMode === 'VPN_MESH') {
      const sent = meshVpn.sendMessage(inputText.trim(), currentUserName);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setInputText('');
      }
    } else {
      const sent = p2pEngine.sendDirectMessage(inputText.trim(), currentUserName);
      if (sent) {
        setMessages((prev) => [...prev, sent]);
        setInputText('');
      }
    }
    setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // File Upload via P2P Tunnel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (networkMode === 'VPN_MESH') {
        const sent = meshVpn.sendMessage(`[Archivo compartido]: ${file.name}`, currentUserName, undefined, {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          base64Url: base64,
        });
        if (sent) {
          setMessages((prev) => [...prev, sent]);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const isConnected = networkMode === 'VPN_MESH' ? isVpnConnected : connectionState === 'CONNECTED';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-5xl bg-discord-darkest rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Principal */}
        <div className="px-6 py-4 bg-discord-sidebar border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-discord-white">
                  Echo Mesh VPN — Red Virtual Privada P2P
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Sin Servidor Central
                </span>
              </div>
              <p className="text-xs text-discord-channel">
                Conecta dispositivos directamente a través de Internet (4G, Wi-Fi distintas, NAT) mediante UDP Hole Punching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-discord-dark border border-white/5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-discord-white text-[11px] truncate max-w-[200px]">
                {networkMode === 'VPN_MESH' ? vpnStatusText : `Offline: ${connectionState}`}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-discord-channel hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector de Modo de Red */}
        <div className="px-6 py-2 bg-discord-dark border-b border-white/5 flex items-center justify-between">
          <div className="flex rounded-xl bg-discord-sidebar p-1 border border-white/5 text-xs">
            <button
              onClick={() => setNetworkMode('VPN_MESH')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                networkMode === 'VPN_MESH'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-discord-channel hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              1. Red Mesh Global (Por Internet / 4G / Cualquier Red)
            </button>
            <button
              onClick={() => setNetworkMode('OFFLINE_LAN')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                networkMode === 'OFFLINE_LAN'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'text-discord-channel hover:text-white'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5" />
              2. Enlace Local / Offline (Sin Internet)
            </button>
          </div>

          <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Túnel Cifrado End-to-End
          </span>
        </div>

        {/* CUERPO DEL MODAL */}
        {isConnected ? (
          // ================= VISTA DE COMUNICACIÓN EN VIVO (CONECTADO) =================
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-discord-dark">
            {/* Panel de Video y Audio */}
            <div className="flex-1 flex flex-col p-4 border-r border-white/5">
              <div className="flex-1 relative bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5 min-h-[300px]">
                {/* Video Remoto */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />

                {/* Video Local en PiP */}
                <div className="absolute bottom-4 right-4 w-44 h-32 bg-neutral-900 rounded-2xl overflow-hidden border-2 border-discord-blurple shadow-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-2 py-0.5 rounded-md text-white font-medium">
                    Tú {isMuted && '🔇'}
                  </div>
                </div>

                {/* Badge de Túnel Activo */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs text-emerald-400 border border-emerald-500/30">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="font-semibold">Túnel UDP Directo sobre Internet</span>
                </div>
              </div>

              {/* Barra de Controles de Llamada */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={toggleMic}
                  className={`p-3.5 rounded-2xl transition-all ${
                    isMuted
                      ? 'bg-discord-red text-white'
                      : 'bg-discord-sidebar hover:bg-discord-hover text-discord-white'
                  }`}
                  title={isMuted ? 'Activar Micrófono' : 'Silenciar Micrófono'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`p-3.5 rounded-2xl transition-all ${
                    isVideoOff
                      ? 'bg-discord-red text-white'
                      : 'bg-discord-sidebar hover:bg-discord-hover text-discord-white'
                  }`}
                  title={isVideoOff ? 'Activar Cámara' : 'Apagar Cámara'}
                >
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleScreenShare}
                  className={`p-3.5 rounded-2xl transition-all ${
                    isScreenSharing
                      ? 'bg-emerald-600 text-white'
                      : 'bg-discord-sidebar hover:bg-discord-hover text-discord-white'
                  }`}
                  title="Compartir Pantalla a 60 FPS"
                >
                  <ScreenShare className="w-5 h-5" />
                </button>

                <button
                  onClick={handleHangUp}
                  className="px-6 py-3.5 bg-discord-red hover:bg-red-700 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg transition-all"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>Desconectar Túnel</span>
                </button>
              </div>
            </div>

            {/* Panel de Chat Directo & Transferencia de Archivos */}
            <div className="w-full md:w-88 flex flex-col bg-discord-darkest border-t md:border-t-0 md:border-l border-white/5">
              <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-discord-white">Chat P2P del Túnel VPN</div>
                  <div className="text-[10px] text-emerald-400">Punto a punto sin intermediarios</div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-discord-channel">
                  <Users className="w-3.5 h-3.5" />
                  <span>{peers.length + 1} nodos</span>
                </div>
              </div>

              {/* Lista de Mensajes */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[220px]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-discord-channel">
                    <ShieldCheck className="w-8 h-8 mb-2 opacity-30 text-emerald-400" />
                    <p className="text-xs font-semibold text-discord-white">Túnel Privado Establecido</p>
                    <p className="text-[11px] opacity-70">
                      Envía mensajes o comparte archivos directamente de equipo a equipo.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderName === currentUserName || m.senderName === myNodeId;
                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 text-[10px] text-discord-channel mb-1">
                          <span className="font-semibold text-discord-white">{m.senderName}</span>
                          <span>{m.timestamp}</span>
                        </div>
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-xs max-w-[88%] break-words ${
                            isMe
                              ? 'bg-discord-blurple text-white rounded-br-none'
                              : 'bg-discord-sidebar text-discord-white rounded-bl-none'
                          }`}
                        >
                          {m.content}
                          {(m as any).fileData && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <a
                                href={(m as any).fileData.base64Url}
                                download={(m as any).fileData.name}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 hover:underline bg-black/30 px-2.5 py-1 rounded-lg"
                              >
                                📎 Descargar {(m as any).fileData.name} (
                                {Math.round((m as any).fileData.size / 1024)} KB)
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatScrollRef} />
              </div>

              {/* Input y Botón de Archivos */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-discord-sidebar hover:bg-discord-hover text-discord-channel hover:text-white rounded-xl transition-colors"
                  title="Compartir archivo P2P"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Mensaje cifrado punto a punto..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-discord-sidebar border border-white/5 rounded-xl px-3 py-2 text-xs text-discord-white placeholder-discord-channel focus:outline-none focus:border-discord-blurple"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          // ================= VISTA DE CONFIGURACIÓN Y NEGOCIACIÓN =================
          <div className="p-6 overflow-y-auto">
            {networkMode === 'VPN_MESH' ? (
              // Modo 1: Red Mesh Virtual Global (Por Internet)
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
                {/* Tarjeta de Mi Dirección de Nodo */}
                <div className="bg-discord-dark/70 p-5 rounded-3xl border border-white/10 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-discord-channel uppercase tracking-wider">
                      Tu Dirección en la Red Virtual Echo (Node ID)
                    </span>
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="text-xs text-discord-blurple hover:underline flex items-center gap-1 font-semibold"
                    >
                      <QrIcon className="w-3.5 h-3.5" />
                      {showQR ? 'Ocultar QR' : 'Ver Código QR'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-discord-darkest p-3 rounded-2xl border border-white/10">
                    <div className="flex-1 font-mono text-sm font-bold text-emerald-400 select-all truncate">
                      {myNodeId || 'Generando ID en la red virtual...'}
                    </div>
                    <button
                      onClick={() => handleCopy(myNodeId)}
                      className="px-3 py-1.5 bg-discord-sidebar hover:bg-discord-hover text-discord-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  <p className="text-[11px] text-discord-channel mt-2">
                    Comparte esta dirección con tu amigo para que se conecte contigo desde cualquier lugar del mundo (incluso desde otra red Wi-Fi o red móvil 4G).
                  </p>

                  {showQR && (
                    <div className="mt-4 flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner animate-in zoom-in-95">
                      <QRCodeSVG value={myNodeId} size={180} />
                      <span className="text-[11px] text-black font-bold mt-2">
                        Escanea para conectar a este nodo Echo
                      </span>
                    </div>
                  )}
                </div>

                {/* Tarjeta de Conexión a Dispositivo Remoto */}
                <form
                  onSubmit={handleConnectMeshPeer}
                  className="bg-discord-dark/70 p-5 rounded-3xl border border-white/10 shadow-lg space-y-4"
                >
                  <h3 className="text-sm font-bold text-discord-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-discord-blurple" />
                    Conectar a un Dispositivo Remoto (Cualquier Red)
                  </h3>
                  <p className="text-xs text-discord-channel">
                    Pega el Node ID de tu amigo para abrir el túnel P2P con llamadas de voz/video y chat instantáneo.
                  </p>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Pega el Node ID de tu amigo (ej: echo-vpn-carlos-x8a2)..."
                      value={targetNodeId}
                      onChange={(e) => setTargetNodeId(e.target.value)}
                      className="w-full bg-discord-darkest border border-white/10 rounded-2xl px-4 py-3 text-xs text-discord-white placeholder-discord-channel font-mono focus:outline-none focus:border-discord-blurple"
                    />

                    <button
                      type="submit"
                      disabled={!targetNodeId.trim()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      Establecer Túnel P2P (UDP Hole Punching)
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Modo 2: Enlace Local / Offline (Sin Internet)
              <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
                <div className="flex rounded-2xl bg-discord-sidebar p-1 max-w-sm mx-auto border border-white/5">
                  <button
                    onClick={() => setOfflineSubTab('HOST')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      offlineSubTab === 'HOST'
                        ? 'bg-discord-blurple text-white shadow-md'
                        : 'text-discord-channel hover:text-white'
                    }`}
                  >
                    1. Crear Sala Local
                  </button>
                  <button
                    onClick={() => setOfflineSubTab('GUEST')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      offlineSubTab === 'GUEST'
                        ? 'bg-discord-blurple text-white shadow-md'
                        : 'text-discord-channel hover:text-white'
                    }`}
                  >
                    2. Unirse a Sala Local
                  </button>
                </div>

                {offlineSubTab === 'HOST' ? (
                  <div className="bg-discord-dark/70 p-5 rounded-3xl border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-discord-white">Paso 1: Generar Código de Invitación Offline</h3>
                    <p className="text-xs text-discord-channel">
                      Genera una oferta SDP estática para redes aisladas sin acceso a Internet.
                    </p>
                    {!offerToken ? (
                      <button
                        onClick={async () => {
                          const t = await p2pEngine.createOffer();
                          setOfferToken(t);
                        }}
                        className="w-full py-3 bg-discord-blurple hover:bg-discord-blurple/80 text-white font-bold text-xs rounded-2xl transition-all"
                      >
                        Generar Oferta Offline
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          readOnly
                          value={offerToken}
                          rows={3}
                          className="w-full bg-discord-darkest border border-white/10 rounded-2xl p-3 text-[11px] text-discord-channel font-mono select-all focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(offerToken)}
                          className="w-full py-2 bg-discord-sidebar text-discord-white font-bold text-xs rounded-xl"
                        >
                          Copiar Código de Oferta
                        </button>
                        <div className="pt-2">
                          <label className="text-xs font-bold text-discord-white block mb-1">
                            Paso 2: Pega la respuesta de tu amigo:
                          </label>
                          <textarea
                            value={answerToken}
                            onChange={(e) => setAnswerToken(e.target.value)}
                            rows={3}
                            placeholder="Pega la respuesta aquí..."
                            className="w-full bg-discord-darkest border border-white/10 rounded-2xl p-3 text-xs text-discord-white font-mono focus:outline-none"
                          />
                          <button
                            onClick={() => p2pEngine.applyAnswer(answerToken)}
                            className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl"
                          >
                            Conectar P2P Offline
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-discord-dark/70 p-5 rounded-3xl border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-discord-white">Paso 1: Pega el Código del Anfitrión</h3>
                    <textarea
                      value={offerToken}
                      onChange={(e) => setOfferToken(e.target.value)}
                      rows={3}
                      placeholder="Pega el código de oferta aquí..."
                      className="w-full bg-discord-darkest border border-white/10 rounded-2xl p-3 text-xs text-discord-white font-mono focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        const ans = await p2pEngine.handleOfferAndCreateAnswer(offerToken);
                        setAnswerToken(ans);
                      }}
                      className="w-full py-3 bg-discord-blurple text-white font-bold text-xs rounded-2xl"
                    >
                      Generar Respuesta Offline
                    </button>
                    {answerToken && (
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-discord-white">Paso 2: Devuelve este código a tu amigo:</label>
                        <textarea
                          readOnly
                          value={answerToken}
                          rows={3}
                          className="w-full bg-discord-darkest border border-white/10 rounded-2xl p-3 text-[11px] text-discord-channel font-mono select-all focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(answerToken)}
                          className="w-full py-2 bg-discord-sidebar text-discord-white font-bold text-xs rounded-xl"
                        >
                          Copiar Respuesta
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
