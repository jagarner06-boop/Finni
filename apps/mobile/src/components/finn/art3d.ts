// 3D plush Finn art (same style as assets/finn/plush-*.png). Files live in assets/finn/3d/ with
// transparent backgrounds (run `npm run finn:cutout -- assets/finn/3d` on white-background exports).
// Add a require() line per file as it arrives; anything missing falls back to the flat art in
// assets.ts, so screens never break while art is still coming in.
//
// Heads: 512×512, head and shoulders centered, filling ~85%.
// Poses: 768×768, full body.

/** Keys match FINN_HEAD / FINN_HEAD_RARE in assets.ts (by mood or rare face). */
export const HEAD_3D: Partial<Record<'happy' | 'thinking' | 'worried' | 'celebrating' | 'sad' | 'skeptical' | 'surprised' | 'love' | 'content' | 'confident', number>> = {
  // happy: require('../../../assets/finn/3d/head-happy.png'),
};

/** Keys match FINN_POSE in assets.ts. */
export const POSE_3D: Partial<Record<'thumbsup' | 'laptop' | 'alert' | 'laughCard' | 'wave', number>> = {
  // wave: require('../../../assets/finn/3d/pose-wave.png'),
};
