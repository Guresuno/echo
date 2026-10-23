import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, Lock } from 'lucide-react';
import { api } from '../services/api';

interface VoiceNoteRecorderProps {
  channelId: number;
  onSent: (msg: any) => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ channelId, onSent }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [livePeaks, setLivePeaks] = useState<number[]>(new Array(40).fill(0.1));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Audio analysis for live visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Animate live wave
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWave = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // sample 40 bars
        const newPeaks: number[] = [];
        const step = Math.floor(dataArray.length / 40) || 1;
        for (let i = 0; i < 40; i++) {
          const val = dataArray[i * step] || 10;
          newPeaks.push(Math.max(0.1, val / 255));
        }
        setLivePeaks(newPeaks);
        animFrameRef.current = requestAnimationFrame(updateWave);
      };
      animFrameRef.current = requestAnimationFrame(updateWave);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      if (err.name === 'NotAllowedError') {
        alert('Permiso de micrófono denegado en el navegador. Por favor permite el acceso al micrófono para grabar.');
      } else if (err.name === 'NotFoundError') {
        alert('No se detectó ningún micrófono físico conectado en este equipo.');
      } else {
        alert(`No se pudo acceder al micrófono: ${err.message || err.name || 'Error desconocido'}`);
      }
    }
  };

  const stopAndSend = async () => {
    if (!mediaRecorderRef.current) return;

    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm; codecs=opus' });
      try {
        const msg = await api.uploadVoiceNote(channelId, audioBlob, duration);
        onSent(msg);
      } catch (e) {
        console.error('Failed to upload voice note:', e);
      } finally {
        cleanup();
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
  };

  const cleanup = () => {
    setIsRecording(false);
    setIsLocked(false);
    setDuration(0);
    audioChunksRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          type="button"
          onClick={startRecording}
          title="Grabar nota de voz Opus"
          className="p-2 text-discord-channel hover:text-discord-white hover:bg-discord-hover rounded-lg transition-colors"
        >
          <Mic className="w-5 h-5" />
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-discord-dark px-3 py-1.5 rounded-xl border border-discord-red/40 shadow-lg animate-in fade-in">
          {/* Pulsing Red Dot */}
          <span className="w-3 h-3 rounded-full bg-discord-red animate-ping" />

          {/* Duration */}
          <span className="text-xs font-mono font-bold text-discord-white">
            {formatDuration(duration)}
          </span>

          {/* Live Waveform (40 Bars) */}
          <div className="flex items-center gap-[2px] h-6 w-48">
            {livePeaks.map((peak, idx) => (
              <span
                key={idx}
                className="w-1 bg-discord-red rounded-full transition-all duration-75"
                style={{ height: `${Math.max(15, peak * 100)}%` }}
              />
            ))}
          </div>

          {/* Lock / Controls */}
          {!isLocked ? (
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              title="Bloquear grabación manos libres"
              className="p-1 hover:text-discord-yellow text-discord-channel transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] font-semibold text-discord-yellow px-1.5 py-0.5 bg-discord-yellow/10 rounded">
              Bloqueado
            </span>
          )}

          {/* Discard */}
          <button
            type="button"
            onClick={cancelRecording}
            title="Cancelar y descartar"
            className="p-1 hover:text-discord-red text-discord-channel transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Send */}
          <button
            type="button"
            onClick={stopAndSend}
            title="Enviar nota de voz"
            className="p-1.5 bg-discord-green hover:bg-discord-green/90 text-white rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// INTERACTIVE 40-BAR WAVEFORM PLAYER FOR RECEIVED MESSAGES
// ==============================================================================

interface WaveformAudioPlayerProps {
  audioUrl: string;
  waveformPeaks?: number[];
  durationSeconds?: number;
}

export const WaveformAudioPlayer: React.FC<WaveformAudioPlayerProps> = ({
  audioUrl,
  waveformPeaks,
  durationSeconds = 0,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(durationSeconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const peaks = waveformPeaks && waveformPeaks.length === 40
    ? waveformPeaks
    : new Array(40).fill(0.2);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || durationSeconds);
    }
  };

  const scrubTo = (ratio: number) => {
    if (audioRef.current && audioDuration > 0) {
      audioRef.current.currentTime = ratio * audioDuration;
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const progressRatio = audioDuration > 0 ? currentTime / audioDuration : 0;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-3 bg-discord-dark/80 px-3.5 py-2.5 rounded-2xl border border-white/5 w-72 shadow-md">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-discord-blurple hover:bg-discord-blurple/90 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      {/* Interactive 40 Waveform Bars */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="flex items-center gap-[2px] h-7 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            scrubTo(clickX / rect.width);
          }}
        >
          {peaks.map((peak, idx) => {
            const barRatio = idx / 40;
            const isPassed = barRatio <= progressRatio;

            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-colors ${
                  isPassed ? 'bg-discord-blurple' : 'bg-discord-channel/40 hover:bg-discord-channel'
                }`}
                style={{ height: `${Math.max(20, peak * 100)}%` }}
              />
            );
          })}
        </div>

        {/* Timestamp */}
        <div className="flex justify-between text-[10px] text-discord-channel font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};
