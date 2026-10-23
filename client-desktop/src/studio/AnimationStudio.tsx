import React, { useState, useRef, useEffect } from 'react';
import getStroke from 'perfect-freehand';
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Upload,
  Download,
  Save,
  Sparkles,
  Layers,
  Palette,
  X,
  Type,
  Maximize2
} from 'lucide-react';
import { AnimationKeyframe, ProjectJSON } from '../types';
import { Timeline } from './Timeline';
import { DualPreview } from './DualPreview';
import { applyWhiteStickerBorder } from './StickerBorderFilter';
import { api } from '../services/api';

interface AnimationStudioProps {
  serverId: number;
  initialAssetType?: 'EMOJI' | 'STICKER';
  onClose: () => void;
  onSaved: (asset: any) => void;
}

export const AnimationStudio: React.FC<AnimationStudioProps> = ({
  serverId,
  initialAssetType = 'STICKER',
  onClose,
  onSaved,
}) => {
  const [assetType, setAssetType] = useState<'EMOJI' | 'STICKER'>(initialAssetType);
  const [shortcode, setShortcode] = useState('');
  const [fps, setFps] = useState(24);
  const [isPlaying, setIsPlaying] = useState(false);
  const [onionSkinEnabled, setOnionSkinEnabled] = useState(true);
  const [whiteBorder, setWhiteBorder] = useState(true);

  // Tools & Colors
  const [tool, setTool] = useState<'BRUSH' | 'ERASER'>('BRUSH');
  const [color, setColor] = useState('#5865F2');
  const [brushSize, setBrushSize] = useState(6);

  // Frames state
  const [frames, setFrames] = useState<AnimationKeyframe[]>([
    {
      id: 'frame-1',
      frameIndex: 0,
      durationMs: 83, // ~12 fps default per frame
      imageDataUrl: '',
      layers: [{ id: 'layer-1', name: 'Capa 1', visible: true, opacity: 1, strokes: [] }],
    },
  ]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);

  // Canvases
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<number[][]>([]); // [x, y, pressure, tiltX, tiltY]

  const CANVAS_SIZE = assetType === 'STICKER' ? 512 : 128;

  // Render current frame to canvas
  const renderFrameToCanvas = (frameIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const frame = frames[frameIdx];
    if (frame && frame.imageDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        renderOnionSkin(frameIdx);
      };
      img.src = frame.imageDataUrl;
    } else {
      renderOnionSkin(frameIdx);
    }
  };

  // Onion skinning: t-1 in red at 25%, t+1 in green at 25%
  const renderOnionSkin = (frameIdx: number) => {
    const onionCanvas = onionCanvasRef.current;
    if (!onionCanvas) return;
    const ctx = onionCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, onionCanvas.width, onionCanvas.height);
    if (!onionSkinEnabled) return;

    // Previous frame (t-1) -> Red tint at 25%
    if (frameIdx > 0 && frames[frameIdx - 1]?.imageDataUrl) {
      const prevImg = new Image();
      prevImg.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.drawImage(prevImg, 0, 0, onionCanvas.width, onionCanvas.height);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#FF3333';
        ctx.fillRect(0, 0, onionCanvas.width, onionCanvas.height);
        ctx.restore();

        // Next frame (t+1) -> Green tint at 25%
        if (frameIdx < frames.length - 1 && frames[frameIdx + 1]?.imageDataUrl) {
          const nextImg = new Image();
          nextImg.onload = () => {
            ctx.save();
            ctx.globalAlpha = 0.25;
            ctx.drawImage(nextImg, 0, 0, onionCanvas.width, onionCanvas.height);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = '#33FF33';
            ctx.fillRect(0, 0, onionCanvas.width, onionCanvas.height);
            ctx.restore();
          };
          nextImg.src = frames[frameIdx + 1].imageDataUrl;
        }
      };
      prevImg.src = frames[frameIdx - 1].imageDataUrl;
    }
  };

  useEffect(() => {
    renderFrameToCanvas(currentFrameIdx);
  }, [currentFrameIdx, onionSkinEnabled, assetType]);

  // Save active canvas to current frame data
  const commitCanvasToFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setFrames((prev) => {
      const updated = [...prev];
      if (updated[currentFrameIdx]) {
        updated[currentFrameIdx] = {
          ...updated[currentFrameIdx],
          imageDataUrl: dataUrl,
        };
      }
      return updated;
    });
  };

  // Pointer Events with stylus pressure & tilt (Section 5.2.1)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current = [[x, y, pressure, e.tiltX || 0, e.tiltY || 0]];
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current.push([x, y, pressure, e.tiltX || 0, e.tiltY || 0]);

    // Draw stroke with perfect-freehand smoothing
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const strokePoints = getStroke(currentStrokeRef.current, {
      size: brushSize,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      easing: (t) => t,
      start: { taper: 0, cap: true },
      end: { taper: 0, cap: true },
    });

    if (strokePoints.length < 2) return;

    ctx.save();
    if (tool === 'ERASER') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000000';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
    }

    ctx.beginPath();
    ctx.moveTo(strokePoints[0][0], strokePoints[0][1]);
    for (let i = 1; i < strokePoints.length; i++) {
      ctx.lineTo(strokePoints[i][0], strokePoints[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      commitCanvasToFrame();
    }
  };

  // Add Frame
  const addFrame = () => {
    const newFrame: AnimationKeyframe = {
      id: `frame-${Date.now()}`,
      frameIndex: frames.length,
      durationMs: Math.floor(1000 / fps),
      imageDataUrl: '',
      layers: [{ id: `layer-${Date.now()}`, name: 'Capa 1', visible: true, opacity: 1, strokes: [] }],
    };
    setFrames([...frames, newFrame]);
    setCurrentFrameIdx(frames.length);
  };

  // Duplicate Frame
  const duplicateFrame = (idx: number) => {
    const target = frames[idx];
    if (!target) return;
    const dup: AnimationKeyframe = {
      ...target,
      id: `frame-${Date.now()}`,
      frameIndex: frames.length,
    };
    const updated = [...frames];
    updated.splice(idx + 1, 0, dup);
    setFrames(updated);
    setCurrentFrameIdx(idx + 1);
  };

  // Delete Frame
  const deleteFrame = (idx: number) => {
    if (frames.length <= 1) return;
    const updated = frames.filter((_, i) => i !== idx);
    setFrames(updated);
    setCurrentFrameIdx(Math.max(0, idx - 1));
  };

  // Import Existing File & Breakdown Frames (Section 5.2.2)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // Load single or multi-frame image
        const newFrame: AnimationKeyframe = {
          id: `frame-imported-${Date.now()}`,
          frameIndex: frames.length,
          durationMs: 83,
          imageDataUrl: dataUrl,
          layers: [{ id: 'imported-layer', name: 'Importada', visible: true, opacity: 1, strokes: [] }],
        };
        setFrames([...frames, newFrame]);
        setCurrentFrameIdx(frames.length);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Save to Server
  const handleSave = async () => {
    if (!shortcode.trim()) {
      alert('Por favor introduce un nombre/código corto (ej. baile_feliz)');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Apply die-cut white border if enabled
    let finalCanvas = canvas;
    if (whiteBorder && assetType === 'STICKER') {
      const borderCanvas = document.createElement('canvas');
      applyWhiteStickerBorder(canvas, borderCanvas, 6);
      finalCanvas = borderCanvas;
    }

    finalCanvas.toBlob(async (blob) => {
      if (!blob) return;

      const projectData: ProjectJSON = {
        version: '1.0',
        canvasWidth: CANVAS_SIZE,
        canvasHeight: CANVAS_SIZE,
        fps,
        assetType,
        frames,
        whiteBorder,
      };

      try {
        const asset = await api.uploadAsset(
          serverId,
          shortcode,
          assetType,
          blob,
          frames.length > 1,
          JSON.stringify(projectData),
          fps
        );
        onSaved(asset);
        onClose();
      } catch (err: any) {
        alert(err.message || 'Error al guardar asset');
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full h-full md:w-[96vw] md:h-[92vh] max-w-6xl bg-discord-darkest rounded-none md:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-3 md:px-6 bg-discord-light">
          <div className="flex items-center gap-2 md:gap-3">
            <Sparkles className="w-5 h-5 text-discord-blurple flex-shrink-0" />
            <h2 className="hidden sm:inline text-sm md:text-base font-bold text-discord-white truncate">
              Estudio Gráfico & Animación
            </h2>
            <div className="flex items-center gap-1 bg-discord-darkest p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setAssetType('STICKER')}
                className={`px-2 md:px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  assetType === 'STICKER' ? 'bg-discord-blurple text-white shadow' : 'text-discord-channel hover:text-white'
                }`}
              >
                Sticker
              </button>
              <button
                onClick={() => setAssetType('EMOJI')}
                className={`px-2 md:px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  assetType === 'EMOJI' ? 'bg-discord-blurple text-white shadow' : 'text-discord-channel hover:text-white'
                }`}
              >
                Emoji
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <input
              type="text"
              placeholder=":nombre:"
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              className="bg-discord-dark px-2 md:px-3 py-1.5 rounded-xl text-xs text-white border border-white/10 focus:outline-none focus:border-discord-blurple w-28 md:w-44"
            />
            <button
              onClick={handleSave}
              className="px-3 md:px-4 py-1.5 bg-discord-green hover:bg-discord-green/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 flex-shrink-0"
            >
              <Save className="w-4 h-4" /> <span className="hidden sm:inline">Guardar</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-discord-dark hover:bg-discord-hover text-discord-white flex items-center justify-center flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          <div className="w-16 bg-discord-dark/70 border-r border-white/5 p-2 flex flex-col items-center gap-3">
            {/* Brush Tool */}
            <button
              onClick={() => setTool('BRUSH')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                tool === 'BRUSH'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'bg-discord-darkest text-discord-channel hover:text-white'
              }`}
              title="Pincel con sensibilidad de presión"
            >
              <Paintbrush className="w-5 h-5" />
            </button>

            {/* Eraser Tool */}
            <button
              onClick={() => setTool('ERASER')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                tool === 'ERASER'
                  ? 'bg-discord-blurple text-white shadow-md'
                  : 'bg-discord-darkest text-discord-channel hover:text-white'
              }`}
              title="Borrador"
            >
              <Eraser className="w-5 h-5" />
            </button>

            {/* Color Palette */}
            <div className="relative group pt-2 border-t border-white/5 w-full flex justify-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-xl cursor-pointer bg-transparent border-none"
                title="Selector de color"
              />
            </div>

            {/* Brush Size Slider */}
            <div className="flex flex-col items-center gap-1 mt-auto pb-2">
              <span className="text-[10px] text-discord-channel">{brushSize}px</span>
              <input
                type="range"
                min="1"
                max="32"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                className="w-12 h-1 accent-discord-blurple cursor-pointer"
                title="Grosor de pincel"
              />
            </div>

            {/* Import file button */}
            <label className="w-11 h-11 rounded-2xl bg-discord-darkest text-discord-channel hover:text-white flex items-center justify-center cursor-pointer border border-white/5">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 bg-discord-darkest flex items-center justify-center relative overflow-hidden p-2 md:p-6 select-none">
            {/* Canvas Outer Frame */}
            <div
              className="relative rounded-2xl shadow-2xl border-2 border-white/10 overflow-hidden bg-[conic-gradient(#2b2d31_90deg,#1e1f22_90deg_180deg,#2b2d31_180deg_270deg,#1e1f22_270deg)] bg-[length:24px_24px] max-w-[85vw] max-h-[45vh] md:max-h-[55vh] aspect-square"
              style={{
                width: assetType === 'STICKER' ? '512px' : '384px',
                height: assetType === 'STICKER' ? '512px' : '384px',
              }}
            >
              {/* Onion Skin Canvas Layer */}
              <canvas
                ref={onionCanvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Main Drawing Canvas (GPU Accelerated) */}
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-20"
              />
            </div>
          </div>

          {/* Right Panel: Dual Preview & Settings */}
          <div className="hidden lg:flex w-72 bg-discord-dark/70 border-l border-white/5 p-4 flex-col justify-between overflow-y-auto">
            {/* Dual Real-Time Preview */}
            <DualPreview
              frames={frames}
              fps={fps}
              whiteBorder={whiteBorder}
              isPlaying={isPlaying}
            />

            {/* Sticker Options */}
            <div className="space-y-3 pt-3 border-t border-white/5">
              <label className="flex items-center justify-between text-xs text-discord-white cursor-pointer bg-discord-darkest p-2.5 rounded-xl border border-white/5">
                <span>Contorno Blanco (Sticker Troquelado)</span>
                <input
                  type="checkbox"
                  checked={whiteBorder}
                  onChange={(e) => setWhiteBorder(e.target.checked)}
                  className="accent-discord-blurple w-4 h-4"
                />
              </label>

              <div className="text-[11px] text-discord-channel leading-relaxed bg-discord-darkest/50 p-2.5 rounded-xl border border-white/5">
                💡 <strong>Soporte Stylus:</strong> Compatible con lápiz óptico y tableta gráfica. El grosor responde dinámicamente a la presión real (0 a 100%).
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Timeline */}
        <Timeline
          frames={frames}
          selectedFrameIdx={currentFrameIdx}
          onSelectFrame={setCurrentFrameIdx}
          onAddFrame={addFrame}
          onDuplicateFrame={duplicateFrame}
          onDeleteFrame={deleteFrame}
          onUpdateDuration={(idx, ms) => {
            setFrames((prev) => {
              const u = [...prev];
              if (u[idx]) u[idx].durationMs = ms;
              return u;
            });
          }}
          fps={fps}
          onFpsChange={setFps}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onionSkinEnabled={onionSkinEnabled}
          onToggleOnionSkin={() => setOnionSkinEnabled(!onionSkinEnabled)}
        />
      </div>
    </div>
  );
};
