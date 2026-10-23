import React, { useState, useEffect } from 'react';
import { AnimationKeyframe } from '../types';

interface DualPreviewProps {
  frames: AnimationKeyframe[];
  fps: number;
  whiteBorder: boolean;
  isPlaying: boolean;
}

export const DualPreview: React.FC<DualPreviewProps> = ({
  frames,
  fps,
  isPlaying,
}) => {
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      setCurrentFrameIdx(0);
      return;
    }

    const currentFrame = frames[currentFrameIdx] || frames[0];
    const duration = currentFrame.durationMs || Math.floor(1000 / fps);

    const timer = setTimeout(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentFrameIdx, isPlaying, frames, fps]);

  const activeFrame = frames[currentFrameIdx] || frames[0];

  return (
    <div className="bg-discord-dark/60 rounded-2xl p-4 border border-white/5 space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-discord-channel">
        Vista Previa Dual Simultánea
      </h3>

      {/* 512x512 Sticker Preview */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-discord-white">Sticker (512x512 px)</span>
          <span className="text-[10px] text-discord-channel">Canal Alfa Transparente</span>
        </div>
        <div className="w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border border-white/10 relative flex items-center justify-center bg-[conic-gradient(#2b2d31_90deg,#1e1f22_90deg_180deg,#2b2d31_180deg_270deg,#1e1f22_270deg)] bg-[length:16px_16px]">
          {activeFrame?.imageDataUrl ? (
            <img
              src={activeFrame.imageDataUrl}
              alt="Sticker Preview"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          ) : (
            <span className="text-[11px] text-discord-channel">Sin fotogramas</span>
          )}
        </div>
      </div>

      {/* 22x22 Emoji Inline & 48x48 Jumbo Preview */}
      <div className="space-y-2 pt-2 border-t border-white/5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-discord-white">Emoji (22x22 px / Jumbo 48x48)</span>
          <span className="text-[10px] text-discord-channel">Renderizado en Chat</span>
        </div>

        {/* Mock Discord Chat Message */}
        <div className="bg-discord-darkest p-2.5 rounded-xl border border-white/5 space-y-2">
          {/* Inline in sentence */}
          <div className="flex items-center gap-1.5 text-xs text-discord-text leading-tight">
            <span>Genial esto</span>
            {activeFrame?.imageDataUrl ? (
              <img
                src={activeFrame.imageDataUrl}
                alt="Emoji 22px"
                className="w-[22px] h-[22px] object-contain inline-block align-middle"
              />
            ) : (
              <span className="w-[22px] h-[22px] bg-discord-blurple/30 rounded inline-block" />
            )}
            <span>¡Nos vemos en el canal de voz!</span>
          </div>

          {/* Jumbo (1-3 emojis) */}
          <div className="pt-1.5 border-t border-white/5 flex items-center gap-2">
            <span className="text-[10px] text-discord-channel">Jumbo:</span>
            {activeFrame?.imageDataUrl ? (
              <img
                src={activeFrame.imageDataUrl}
                alt="Emoji Jumbo 48px"
                className="w-12 h-12 object-contain"
              />
            ) : (
              <span className="w-12 h-12 bg-discord-blurple/30 rounded" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
