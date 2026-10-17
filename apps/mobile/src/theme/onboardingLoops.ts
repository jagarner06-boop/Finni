/** Values from the supplied motion handoff, shared by refresh and thinking. */
export function loopFrame(kind: 'float' | 'bob' | 'dot', phase: number): { y: number; rotation: number } {
  'worklet';
  if (kind === 'float') return { y: -3 + 3 * Math.cos(phase * Math.PI * 2), rotation: 0 };
  if (kind === 'dot') return { y: phase < 0.6 ? -4 * Math.sin(phase / 0.6 * Math.PI) : 0, rotation: 0 };
  const p = Math.max(0, Math.min(1, phase));
  // Ease each segment into its direction change instead of snapping at the keyframes.
  const ease = (t: number) => t * t * (3 - 2 * t);
  if (p <= 0.25) { const t = ease(p / 0.25); return { y: -4 * t, rotation: -6 * t }; }
  if (p <= 0.75) { const t = ease((p - 0.25) / 0.5); return { y: -4 + 2 * t, rotation: -6 + 11 * t }; }
  const t = ease((p - 0.75) / 0.25);
  return { y: -2 + 2 * t, rotation: 5 - 5 * t };
}
