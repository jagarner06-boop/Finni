// Platform-agnostic confetti simulation. Render each particle with
// @shopify/react-native-skia (preferred) or absolutely-positioned Animated views.
// Coordinates are in points. Step once per frame (60fps). Values below are final.

export type Shape = 'rect' | 'circle' | 'squiggle';
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; w: number; h: number;
  color: string; shape: Shape; phase: number;
}

export const CONFETTI = {
  small: { count: 80, spread: 1.6, speedMin: 8, speedRand: 8, frames: 120 },
  big:   { count: 170, spread: 2.4, speedMin: 11, speedRand: 8, frames: 170 },
  gravity: 0.275,      // pt/frame²
  drag: 0.975,         // velocity multiplier per frame
  sway: 0.4,           // pt, horizontal sine sway amplitude
  swayPeriod: 9,       // frames per radian
  fadeFrames: 30,      // fade out over the last N frames
  originJitterX: 30,   // ± pt around the horizontal center
  sizeW: [5, 10],      // rect width = 5 + rand*5
  sizeH: [3, 6.5],     // rect height = 3 + rand*3.5 (flips with cos(rot*1.5))
  shapeMix: { circle: 0.28, squiggle: 0.11 }, // remainder = rect
} as const;

export function createBurst(opts: {
  width: number; height: number; originY: number; // originY as 0..1 of height
  big?: boolean; density?: number; colors: readonly string[];
}): Particle[] {
  const c = opts.big ? CONFETTI.big : CONFETTI.small;
  const n = Math.round(c.count * (opts.density ?? 1));
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * c.spread;
    const sp = c.speedMin + Math.random() * c.speedRand;
    const r = Math.random();
    out.push({
      x: opts.width / 2 + (Math.random() - 0.5) * CONFETTI.originJitterX * 2,
      y: opts.height * opts.originY,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 0.35,
      w: 5 + Math.random() * 5, h: 3 + Math.random() * 3.5,
      color: opts.colors[i % opts.colors.length],
      shape: r < CONFETTI.shapeMix.circle ? 'circle' : r < CONFETTI.shapeMix.circle + CONFETTI.shapeMix.squiggle ? 'squiggle' : 'rect',
      phase: Math.random() * 6,
    });
  }
  return out;
}

/** Advance one frame. Returns opacity (0..1) for this frame; done when frame >= total. */
export function step(ps: Particle[], frame: number, big?: boolean): number {
  const total = (big ? CONFETTI.big : CONFETTI.small).frames;
  for (const p of ps) {
    p.vy += CONFETTI.gravity;
    p.vx *= CONFETTI.drag; p.vy *= CONFETTI.drag;
    p.x += p.vx + Math.sin(frame / CONFETTI.swayPeriod + p.phase) * CONFETTI.sway;
    p.y += p.vy; p.rot += p.vrot;
  }
  return Math.max(0, Math.min(1, (total - frame) / CONFETTI.fadeFrames));
}
// Drawing: rect → w × (h*|cos(rot*1.5)|+0.5), rotated by rot. circle → radius h*0.6.
// squiggle → 2pt stroke, round cap: M-4 0 Q-1.5 -3.5 1 0 Q3 3.5 5 0.
// Overlay is full-screen, pointerEvents="none", above content. Skip entirely when Reduce Motion is on.
