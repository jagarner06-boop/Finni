import type { Mood } from '@finni/shared';

import { HEAD_3D, POSE_3D } from '@/components/finn/art3d';

// Flat Finn art. PNGs are downscaled placeholders (cream background, drawn with
// multiply) until the transparent re-exports with cobalt ticks land.

export const FINN_HEAD = {
  happy: require('../../../assets/finn/head-happy.png'),
  thinking: require('../../../assets/finn/head-curious.png'),
  worried: require('../../../assets/finn/head-worried.png'),
  celebrating: require('../../../assets/finn/head-excited.png'),
  // 3D plush art replaces the flat head as each file lands (art3d.ts).
  ...HEAD_3D,
} satisfies Record<Mood, number>;

/** Chosen explicitly by context, never derived from Mood. */
export const FINN_HEAD_RARE = {
  sad: require('../../../assets/finn/head-sad.png'), // declined action
  skeptical: require('../../../assets/finn/head-skeptical.png'), // suspicious charge
  surprised: require('../../../assets/finn/head-surprised.png'), // spending spike
  love: require('../../../assets/finn/head-love.png'), // goal completed ONLY
  content: require('../../../assets/finn/head-content.png'),
  confident: require('../../../assets/finn/head-confident.png'),
  ...HEAD_3D,
} as Record<'sad' | 'skeptical' | 'surprised' | 'love' | 'content' | 'confident', number>;

export const FINN_POSE = {
  thumbsup: require('../../../assets/finn/pose-thumbsup.png'), // happy, empty states
  laptop: require('../../../assets/finn/pose-laptop.png'), // thinking, loading
  alert: require('../../../assets/finn/pose-alert.png'), // worried
  laughCard: require('../../../assets/finn/pose-laugh-card.png'), // celebrating, Home nudge
  wave: require('../../../assets/finn/pose-wave.png'), // peek, greeting
  ...POSE_3D,
} as Record<'thumbsup' | 'laptop' | 'alert' | 'laughCard' | 'wave', number>;

export const FINN_POSE_FOR_MOOD: Record<Mood, keyof typeof FINN_POSE> = {
  happy: 'thumbsup',
  thinking: 'laptop',
  worried: 'alert',
  celebrating: 'laughCard',
};

/** Hero moments only: Welcome, session loading, goal complete. */
export const FINN_PLUSH = {
  welcome: require('../../../assets/finn/plush-card.png'),
  loading: require('../../../assets/finn/plush-wave.png'),
  complete: require('../../../assets/finn/plush-celebrate.png'),
} as const;

export const FINN_LABEL: Record<Mood, string> = {
  happy: 'Finn looks happy',
  thinking: 'Finn is thinking',
  worried: 'Finn looks worried',
  celebrating: 'Finn is celebrating',
};

/** Exact flat heads for the onboarding/motion handoff, independent of optional 3D overrides. */
export const ONBOARDING_HEAD = {
  happy: require('../../../assets/finn/head-happy.png'),
  curious: require('../../../assets/finn/head-curious.png'),
  excited: require('../../../assets/finn/head-excited.png'),
  confident: require('../../../assets/finn/head-confident.png'),
  surprised: require('../../../assets/finn/head-surprised.png'),
  love: require('../../../assets/finn/head-love.png'),
} as const;
