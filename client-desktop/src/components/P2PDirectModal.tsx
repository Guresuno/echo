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
  WifiOff,
  QrCode as QrIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  const [activeTab, setActiveTab] = useState<'HOST' | 'GUEST'>('HOST');
  const [connectionState, setConnectionState] = useState<P2PConnectionState>('DISCONNECTED');

  // Tokens
  const [offerToken, setOfferToken] = useState('');
  const [answerToken, setAnswerToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [inputText, setInputText] = useState('');

  // Refs for video
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    p2pEngine.setOnStateChange((state) => {
      setConnectionState(state);
    });

    p2pEngine.setOnMessage((msg) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    p2pEngine.setOnRemoteStream((stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    return () => {
      // Don't auto-disconnect on close unless user clicks Hang Up
    };
  }, [isOpen]);

  // Hook up local video when stream is ready
  const bindLocalVideo = async () => {
    const stream = await p2pEngine.getLocalMedia(true, true);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  // 1. HOST: Iniciar creación de oferta
  const handleGenerateOffer = async () => {
    try {
      const token = await p2pEngine.createOffer();
      setOfferToken(token);
      bindLocalVideo();
    } catch (e: any) {
      alert(`Error creando oferta P2P: ${e.message}`);
    }
  };

  // 2. HOST: Aplicar respuesta de invitado
  const handleApplyAnswer = async () => {
    if (!answerToken.trim()) return;
    try {
      await p2pEngine.applyAnswer(answerToken);
    } catch (e: any) {
      alert(`Error conectando con la respuesta: ${e.message}`);
    }
  };

  // 3. GUEST: Procesar oferta del anfitrión y generar respuesta
  const handleProcessOfferAndAnswer = async () => {
    if (!offerToken.trim()) return;
    try {
      const generatedAnswer = await p2pEngine.handleOfferAndCreateAnswer(offerToken);
      setAnswerToken(generatedAnswer);
      bindLocalVideo();
    } catch (e: any) {
      alert(`Error procesando la oferta P2P: ${e.message}`);
    }
  };

  // Copiar al portapapeles
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Controles de medios
  const toggleMic = () => {
    const next = !isMuted;
    setIsMuted(next);
    p2pEngine.setMicEnabled(!next);
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    p2pEngine.setVideoEnabled(!next);
  };

  const handleScreenShare = async () => {
    try {
      const stream = await p2pEngine.startScreenShare();
      setIsScreenSharing(true);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        bindLocalVideo();
      };
    } catch (e) {
      console.warn('Screen share cancelado o no soportado:', e);
    }
  };

  const handleHangUp = () => {
    p2pEngine.cleanup();
    setOfferToken('');
    setAnswerToken('');
    setMessages([]);
    onClose();
  };

  // Envío de mensaje directo P2P (RTCDataChannel)
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const sent = p2pEngine.sendDirectMessage(inputText.trim(), currentUserName);
    if (sent) {
      setMessages((prev) => [...prev, sent]);
      setInputText('');
      setTimeout(() => {
        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-discord-darkest rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-discord-sidebar border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-discord-blurple/20 text-discord-blurple">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-discord-white flex items-center gap-2">
                Llamadas y Chat P2P Directo
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Sin Servidor
                </span>
              </h2>
              <p className="text-xs text-discord-channel">
                Conexión WebRTC directa de equipo a equipo. Funciona con o sin conexión al servidor central.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Estado de la conexión */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-discord-dark border border-white/5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionState === 'CONNECTED'
                    ? 'bg-emerald-400 animate-ping'
                    : connectionState === 'DISCONNECTED'
                    ? 'bg-neutral-500'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-discord-white">
                {connectionState === 'CONNECTED' && '🟢 Conectado P2P En Vivo'}
                {connectionState === 'DISCONNECTED' && 'Desconectado'}
                {connectionState === 'GENERATING_OFFER' && 'Generando Oferta...'}
                {connectionState === 'WAITING_FOR_ANSWER' && 'Esperando Respuesta...'}
                {connectionState === 'GENERATING_ANSWER' && 'Creando Respuesta...'}
                {connectionState === 'CONNECTING' && 'Estableciendo Enlace...'}
                {connectionState === 'FAILED' && '🔴 Error de Conexión'}
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

        {/* CUERPO PRINCIPAL */}
        {connectionState === 'CONNECTED' ? (
          // ================= VISTA DE COMUNICACIÓN EN VIVO =================
          <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-discord-dark">
            {/* Grid de Video/Audio */}
            <div className="flex-1 flex flex-col p-4 border-r border-white/5">
              <div className="flex-1 relative bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5">
                {/* Video Remoto */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />

                {/* Video Local en PiP */}
                <div className="absolute bottom-4 right-4 w-40 h-28 bg-neutral-900 rounded-xl overflow-hidden border-2 border-discord-blurple shadow-2xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  <div className="absolute bottom-1 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded text-white">
                    Tú {isMuted && '🔇'}
                  </div>
                </div>

                {/* Badge de seguridad P2P */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] text-emerald-400 border border-emerald-500/20">
                  <Lock className="w-3 h-3" />
                  <span>Cifrado P2P Punto a Punto</span>
                </div>
              </div>

              {/* Barra de Controles */}
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
                  <span>Finalizar</span>
                </button>
              </div>
            </div>

            {/* Panel de Chat Directo (DMs vía RTCDataChannel) */}
            <div className="w-full md:w-80 flex flex-col bg-discord-darkest border-t md:border-t-0 md:border-l border-white/5">
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-discord-white">Mensajes Directos P2P</span>
                <span className="text-[10px] text-discord-channel">Sin Servidor</span>
              </div>

              {/* Mensajes */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[200px] max-h-[350px] md:max-h-none">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-discord-channel">
                    <Radio className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs">Canal de datos abierto.</p>
                    <p className="text-[11px] opacity-70">Envía un mensaje para comenzar a chatear.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.senderName === currentUserName ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-discord-channel mb-1">
                        <span className="font-semibold text-discord-white">{m.senderName}</span>
                        <span>{m.timestamp}</span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                          m.senderName === currentUserName
                            ? 'bg-discord-blurple text-white rounded-br-none'
                            : 'bg-discord-sidebar text-discord-white rounded-bl-none'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatScrollRef} />
              </div>

              {/* Input de Chat P2P */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  placeholder="Mensaje P2P directo..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-discord-sidebar border border-white/5 rounded-xl px-3 py-2 text-xs text-discord-white placeholder-discord-channel focus:outline-none focus:border-discord-blurple"
                />
                <button
                  type="submit"
                  className="p-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          // ================= VISTA DE HANDSHAKE / NEGOCIACIÓN =================
          <div className="p-6 overflow-y-auto">
            {/* Selector de Rol */}
            <div className="flex rounded-2xl bg-discord-sidebar p-1 mb-6 border border-white/5 max-w-md mx-auto">
              <button
                onClick={() => setActiveTab('HOST')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'HOST'
                    ? 'bg-discord-blurple text-white shadow-md'
                    : 'text-discord-channel hover:text-white'
                }`}
              >
                1. Crear Sala (Anfitrión)
              </button>
              <button
                onClick={() => setActiveTab('GUEST')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'GUEST'
                    ? 'bg-discord-blurple text-white shadow-md'
                    : 'text-discord-channel hover:text-white'
                }`}
              >
                2. Unirse a Sala (Invitado)
              </button>
            </div>

            {/* TAB ANFITRIÓN */}
            {activeTab === 'HOST' && (
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="bg-discord-dark/60 p-4 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-discord-white mb-1">
                    Paso 1: Generar Código de Invitación P2P
                  </h3>
                  <p className="text-xs text-discord-channel mb-4">
                    Al pulsar el botón se inicializará tu cámara/micrófono y se creará un código de enlace seguro.
                  </p>

                  {!offerToken ? (
                    <button
                      onClick={handleGenerateOffer}
                      disabled={connectionState === 'GENERATING_OFFER'}
                      className="w-full py-3 bg-discord-blurple hover:bg-discord-blurple/80 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Radio className="w-4 h-4" />
                      {connectionState === 'GENERATING_OFFER'
                        ? 'Generando Oferta...'
                        : 'Generar Código de Conexión P2P'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-400">
                          Código de Oferta Generado:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowQR(!showQR)}
                            className="text-xs text-discord-channel hover:text-white flex items-center gap-1"
                          >
                            <QrIcon className="w-3.5 h-3.5" />
                            {showQR ? 'Ocultar QR' : 'Ver QR'}
                          </button>
                          <button
                            onClick={() => handleCopy(offerToken)}
                            className="text-xs text-discord-blurple hover:underline flex items-center gap-1 font-semibold"
                          >
                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? '¡Copiado!' : 'Copiar Código'}
                          </button>
                        </div>
                      </div>

                      <textarea
                        readOnly
                        value={offerToken}
                        rows={3}
                        className="w-full bg-discord-darkest border border-white/10 rounded-xl p-2.5 text-[11px] text-discord-channel font-mono select-all focus:outline-none"
                      />

                      {showQR && (
                        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl">
                          <QRCodeSVG value={offerToken} size={180} />
                          <span className="text-[10px] text-black font-semibold mt-2">
                            Escanea con la cámara de tu móvil para conectar
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Paso 2 del Anfitrión */}
                {offerToken && (
                  <div className="bg-discord-dark/60 p-4 rounded-2xl border border-white/5 animate-in fade-in">
                    <h3 className="text-sm font-bold text-discord-white mb-1">
                      Paso 2: Pega la Respuesta (Answer) de tu amigo
                    </h3>
                    <p className="text-xs text-discord-channel mb-3">
                      Tu amigo debe pegar tu código de oferta en la pestaña "Unirse a Sala" y enviarte su código generado.
                    </p>

                    <textarea
                      placeholder="Pega aquí el código de respuesta que te devolvió tu amigo..."
                      value={answerToken}
                      onChange={(e) => setAnswerToken(e.target.value)}
                      rows={3}
                      className="w-full bg-discord-darkest border border-white/10 rounded-xl p-2.5 text-xs text-discord-white placeholder-discord-channel font-mono focus:outline-none focus:border-discord-blurple mb-3"
                    />

                    <button
                      onClick={handleApplyAnswer}
                      disabled={!answerToken.trim()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Conectar y Comenzar Llamada P2P
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB INVITADO */}
            {activeTab === 'GUEST' && (
              <div className="space-y-6 max-w-xl mx-auto">
                <div className="bg-discord-dark/60 p-4 rounded-2xl border border-white/5">
                  <h3 className="text-sm font-bold text-discord-white mb-1">
                    Paso 1: Pega el Código de Oferta del Anfitrión
                  </h3>
                  <p className="text-xs text-discord-channel mb-3">
                    Pega aquí el código que copió o compartió la persona que inició la sala.
                  </p>

                  <textarea
                    placeholder="Pega el código de oferta aquí..."
                    value={offerToken}
                    onChange={(e) => setOfferToken(e.target.value)}
                    rows={3}
                    className="w-full bg-discord-darkest border border-white/10 rounded-xl p-2.5 text-xs text-discord-white placeholder-discord-channel font-mono focus:outline-none focus:border-discord-blurple mb-3"
                  />

                  <button
                    onClick={handleProcessOfferAndAnswer}
                    disabled={!offerToken.trim() || connectionState === 'GENERATING_ANSWER'}
                    className="w-full py-3 bg-discord-blurple hover:bg-discord-blurple/80 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Radio className="w-4 h-4" />
                    {connectionState === 'GENERATING_ANSWER'
                      ? 'Generando Mi Respuesta...'
                      : 'Generar Mi Código de Respuesta'}
                  </button>
                </div>

                {answerToken && (
                  <div className="bg-discord-dark/60 p-4 rounded-2xl border border-white/5 animate-in fade-in">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-discord-white">
                        Paso 2: Devuelve este Código a tu Amigo
                      </h3>
                      <button
                        onClick={() => handleCopy(answerToken)}
                        className="text-xs text-discord-blurple hover:underline flex items-center gap-1 font-semibold"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? '¡Copiado!' : 'Copiar Respuesta'}
                      </button>
                    </div>

                    <p className="text-xs text-discord-channel mb-3">
                      Copia este código y envíaselo al anfitrión para que lo pegue en su Paso 2. Una vez que lo pegue, ¡la llamada y los mensajes iniciarán automáticamente!
                    </p>

                    <textarea
                      readOnly
                      value={answerToken}
                      rows={3}
                      className="w-full bg-discord-darkest border border-white/10 rounded-xl p-2.5 text-[11px] text-discord-channel font-mono select-all focus:outline-none"
                    />
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
