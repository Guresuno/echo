import React from 'react';
import { Play, Pause, Plus, Copy, Trash2, Eye, EyeOff, Layers } from 'lucide-react';
import { AnimationKeyframe } from '../types';

interface TimelineProps {
  frames: AnimationKeyframe[];
  selectedFrameIdx: number;
  onSelectFrame: (idx: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (idx: number) => void;
  onDeleteFrame: (idx: number) => void;
  onUpdateDuration: (idx: number, ms: number) => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onionSkinEnabled: boolean;
  onToggleOnionSkin: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  selectedFrameIdx,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onUpdateDuration,
  fps,
  onFpsChange,
  isPlaying,
  onTogglePlay,
  onionSkinEnabled,
  onToggleOnionSkin,
}) => {
  return (
    <div className="h-32 bg-discord-darkest border-t border-white/5 p-3 flex flex-col justify-between">
      {/* Controls Header */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
              isPlaying
                ? 'bg-discord-yellow text-black'
                : 'bg-discord-blurple hover:bg-discord-blurple/90 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pausar' : 'Reproducir'}
          </button>

          {/* FPS Selector */}
          <div className="flex items-center gap-1 bg-discord-dark px-2 py-1 rounded-lg border border-white/5">
            <span className="text-discord-channel font-medium">FPS:</span>
            {[12, 24, 30, 60].map((rate) => (
              <button
                key={rate}
                onClick={() => onFpsChange(rate)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                  fps === rate
                    ? 'bg-discord-blurple text-white'
                    : 'text-discord-channel hover:text-white'
                }`}
              >
                {rate}
              </button>
            ))}
          </div>

          {/* Onion Skinning Toggle */}
          <button
            onClick={onToggleOnionSkin}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              onionSkinEnabled
                ? 'bg-discord-green/20 border-discord-green text-discord-green'
                : 'bg-discord-dark border-white/5 text-discord-channel hover:text-white'
            }`}
            title="Papel Cebolla: Visualiza t-1 en rojo y t+1 en verde"
          >
            <Layers className="w-3.5 h-3.5" />
            Papel Cebolla (Onion Skin)
          </button>
        </div>

        {/* Frame Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddFrame}
            className="px-2.5 py-1.5 bg-discord-dark hover:bg-discord-hover text-discord-white rounded-lg flex items-center gap-1 border border-white/5"
            title="Agregar nuevo fotograma en blanco"
          >
            <Plus className="w-3.5 h-3.5" /> Fotograma
          </button>
          <button
            onClick={() => onDuplicateFrame(selectedFrameIdx)}
            className="p-1.5 hover:bg-discord-hover text-discord-channel hover:text-white rounded-lg"
            title="Duplicar fotograma actual"
          >
            <Copy className="w-4 h-4" />
          </button>
          {frames.length > 1 && (
            <button
              onClick={() => onDeleteFrame(selectedFrameIdx)}
              className="p-1.5 hover:bg-discord-hover text-discord-channel hover:text-discord-red rounded-lg"
              title="Eliminar fotograma actual"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Frame Filmstrip */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 pr-2">
        {frames.map((frame, idx) => {
          const isSelected = idx === selectedFrameIdx;
          return (
            <div
              key={frame.id || idx}
              onClick={() => onSelectFrame(idx)}
              className={`flex-shrink-0 w-20 h-16 rounded-xl border-2 flex flex-col items-center justify-between p-1 cursor-pointer transition-all ${
                isSelected
                  ? 'border-discord-blurple bg-discord-blurple/15 scale-105 shadow-md'
                  : 'border-white/10 hover:border-white/30 bg-discord-dark/50'
              }`}
            >
              <div className="w-full flex justify-between items-center text-[10px] text-discord-channel font-mono px-1">
                <span>#{idx + 1}</span>
                <input
                  type="number"
                  value={frame.durationMs || Math.floor(1000 / fps)}
                  onChange={(e) => onUpdateDuration(idx, parseInt(e.target.value, 10) || 50)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-10 bg-black/40 text-center rounded text-white text-[9px] px-0.5"
                  title="Duración del fotograma en ms"
                />
              </div>

              {/* Thumbnail */}
              <div className="w-full flex-1 rounded overflow-hidden flex items-center justify-center bg-black/30">
                {frame.imageDataUrl ? (
                  <img
                    src={frame.imageDataUrl}
                    alt={`Frame ${idx + 1}`}
                    className="max-h-8 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[9px] text-discord-channel">Vacío</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
