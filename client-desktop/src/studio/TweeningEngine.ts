export interface TransformState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export function interpolateTransform(
  start: TransformState,
  end: TransformState,
  progress: number
): TransformState {
  const p = Math.max(0, Math.min(1, progress));
  // Smooth ease-in-out easing
  const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

  return {
    x: start.x + (end.x - start.x) * ease,
    y: start.y + (end.y - start.y) * ease,
    scale: start.scale + (end.scale - start.scale) * ease,
    rotation: start.rotation + (end.rotation - start.rotation) * ease,
    opacity: start.opacity + (end.opacity - start.opacity) * ease,
  };
}
