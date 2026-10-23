export function applyWhiteStickerBorder(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  borderThickness: number = 6
) {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  targetCanvas.width = w;
  targetCanvas.height = h;

  ctx.clearRect(0, 0, w, h);

  // Render white silhouettes dilated by borderThickness
  ctx.save();
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 0;

  // Dilation ring in 16 angles
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const angle = (i * 2 * Math.PI) / steps;
    const dx = Math.cos(angle) * borderThickness;
    const dy = Math.sin(angle) * borderThickness;
    ctx.drawImage(sourceCanvas, dx, dy);
  }

  // Tint dilation passes solid white
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Draw original graphic on top
  ctx.drawImage(sourceCanvas, 0, 0);
}
