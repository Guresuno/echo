import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Volume2, VolumeX, Radio, Menu } from 'lucide-react';
import { Room, RoomEvent, Track, createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client';
import { api } from '../services/api';
import { Channel } from '../types';

interface VoiceVideoRoomProps {
  channel: Channel;
  onDisconnect: () => void;
  onToggleMobileDrawer?: () => void;
  onOpenP2P?: () => void;
}

export const VoiceVideoRoom: React.FC<VoiceVideoRoomProps> = ({ channel, onDisconnect, onToggleMobileDrawer, onOpenP2P }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isServerOffline, setIsServerOffline] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let currentRoom: Room | null = null;

    const connectToLiveKit = async () => {
      try {
        const tokenData = await api.getVoiceToken(channel.ChannelID);
        const lkRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720, frameRate: 30 },
          },
          publishDefaults: {
            screenShareEncoding: {
              maxBitrate: 3_000_000,
              maxFramerate: 60, // Screen sharing at 60 FPS
            },
          },
        });

        currentRoom = lkRoom;
        setRoom(lkRoom);

        lkRoom.on(RoomEvent.ParticipantConnected, () => {
          setParticipants(Array.from(lkRoom.remoteParticipants.values()).map((p) => p.name || p.identity));
        });

        lkRoom.on(RoomEvent.ParticipantDisconnected, () => {
          setParticipants(Array.from(lkRoom.remoteParticipants.values()).map((p) => p.name || p.identity));
        });

        lkRoom.on(RoomEvent.TrackSubscribed, (track: Track) => {
          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            const el = track.attach();
            if (videoContainerRef.current) {
              videoContainerRef.current.appendChild(el);
            }
          }
        });

        await lkRoom.connect(tokenData.livekit_url, tokenData.token);
        // Publish default mic
        await lkRoom.localParticipant.enableCameraAndMicrophone();
        setIsMuted(false);
        setIsVideoEnabled(true);
      } catch (err) {
        console.warn('LiveKit connection fallback:', err);
        setParticipants(['Tú (Conectado)']);
        setIsServerOffline(true);
      }
    };

    connectToLiveKit();

    // Push-to-Talk Key Listener (Space / Ctrl)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ControlRight' || e.code === 'F24') {
        if (!isPushToTalkActive && room) {
          setIsPushToTalkActive(true);
          room.localParticipant.setMicrophoneEnabled(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ControlRight' || e.code === 'F24') {
        if (isPushToTalkActive && room) {
          setIsPushToTalkActive(false);
          room.localParticipant.setMicrophoneEnabled(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (currentRoom) {
        currentRoom.disconnect();
      }
    };
  }, [channel.ChannelID]);

  const toggleMic = async () => {
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    if (room) {
      await room.localParticipant.setCameraEnabled(!isVideoEnabled);
    }
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleScreenShare = async () => {
    if (room) {
      try {
        const next = !isScreenSharing;
        await room.localParticipant.setScreenShareEnabled(next, {
          audio: true, // System audio support
          resolution: { width: 1920, height: 1080, frameRate: 60 }, // 60 FPS
        });
        setIsScreenSharing(next);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    } else {
      setIsScreenSharing(!isScreenSharing);
    }
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    if (!isDeafened) {
      setIsMuted(true);
      if (room) room.localParticipant.setMicrophoneEnabled(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-discord-darkest h-full relative overflow-hidden">
      {/* Voice Channel Header */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-3 md:px-4 bg-discord-light">
        <div className="flex items-center gap-2">
          {onToggleMobileDrawer && (
            <button
              onClick={onToggleMobileDrawer}
              className="p-1.5 -ml-1 text-discord-channel hover:text-white md:hidden"
              title="Abrir Canales"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Radio className="w-5 h-5 text-discord-green animate-pulse" />
          <h2 className="text-sm font-bold text-discord-white truncate max-w-[140px] sm:max-w-xs">{channel.Name}</h2>
          <span className="hidden sm:inline text-[11px] font-semibold text-discord-channel bg-black/30 px-2 py-0.5 rounded-full">
            LiveKit SFU 60FPS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-discord-channel">
            {participants.length} en la sala
          </span>
        </div>
      </div>

      {/* Banner de Servidor Desconectado */}
      {isServerOffline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <span>⚠️ Servidor de llamadas SFU desconectado. Puedes comunicarte directamente punto a punto.</span>
          {onOpenP2P && (
            <button
              onClick={onOpenP2P}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              Conectar P2P Directo
            </button>
          )}
        </div>
      )}

      {/* Video & Screen Streams Grid */}
      <div
        ref={videoContainerRef}
        className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto items-center justify-center"
      >
        {/* Local Stream Card */}
        <div className="relative bg-discord-dark rounded-2xl overflow-hidden aspect-video border border-white/5 flex items-center justify-center shadow-lg">
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-discord-blurple flex items-center justify-center text-white text-2xl font-bold shadow-md">
                Tú
              </div>
              <span className="text-xs font-semibold text-discord-white mt-2">Cámara Desactivada</span>
            </div>
          )}

          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium text-white flex items-center gap-1.5">
            {isMuted ? <MicOff className="w-3.5 h-3.5 text-discord-red" /> : <Mic className="w-3.5 h-3.5 text-discord-green" />}
            Tú {isPushToTalkActive && '(Hablando por PTT)'}
          </div>
        </div>

        {/* Screen Share Preview Card (if active) */}
        {isScreenSharing && (
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-discord-green/40 flex items-center justify-center shadow-2xl">
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-discord-green text-black px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
              Pantalla 60 FPS + Audio Sistema
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-20 bg-discord-dark/95 border-t border-white/5 flex items-center justify-center gap-3 px-4 backdrop-blur-md">
        {/* Mic Toggle */}
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isMuted
              ? 'bg-discord-red hover:bg-discord-red/90 text-white'
              : 'bg-discord-light hover:bg-discord-hover text-discord-white'
          }`}
          title={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            !isVideoEnabled
              ? 'bg-discord-light hover:bg-discord-hover text-discord-channel'
              : 'bg-discord-blurple hover:bg-discord-blurple/90 text-white'
          }`}
          title={isVideoEnabled ? 'Desactivar cámara' : 'Activar cámara'}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isScreenSharing
              ? 'bg-discord-green hover:bg-discord-green/90 text-white'
              : 'bg-discord-light hover:bg-discord-hover text-discord-white'
          }`}
          title="Compartir Pantalla a 60 FPS"
        >
          <ScreenShare className="w-5 h-5" />
        </button>

        {/* Deafen Toggle */}
        <button
          onClick={toggleDeafen}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
            isDeafened
              ? 'bg-discord-red hover:bg-discord-red/90 text-white'
              : 'bg-discord-light hover:bg-discord-hover text-discord-white'
          }`}
          title={isDeafened ? 'Ensordecer desactivado' : 'Ensordecerse'}
        >
          {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Disconnect Button */}
        <button
          onClick={onDisconnect}
          className="w-12 h-12 rounded-2xl bg-discord-red hover:bg-discord-red/90 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md ml-4"
          title="Desconectar de la llamada"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
