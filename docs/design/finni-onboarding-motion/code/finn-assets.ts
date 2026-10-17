// apps/mobile/src/components/finn/assets.ts
import type { Mood } from '@finni/shared';

export const FINN_HEAD = {
  happy: require('@/assets/finn/head-happy.png'),
  thinking: require('@/assets/finn/head-curious.png'),
  worried: require('@/assets/finn/head-worried.png'),
  celebrating: require('@/assets/finn/head-excited.png'),
} satisfies Record<Mood, number>;

/** Chosen explicitly by context — never derived from Mood. */
export const FINN_HEAD_RARE = {
  sad: require('@/assets/finn/head-sad.png'),             // declined action
  skeptical: require('@/assets/finn/head-skeptical.png'), // suspicious charge
  surprised: require('@/assets/finn/head-surprised.png'), // spending spike
  love: require('@/assets/finn/head-love.png'),           // goal completed ONLY
  content: require('@/assets/finn/head-content.png'),
  confident: require('@/assets/finn/head-confident.png'),
} as const;

export const FINN_POSE = {
  thumbsup: require('@/assets/finn/pose-thumbsup.png'),   // happy, empty states
  laptop: require('@/assets/finn/pose-laptop.png'),       // thinking, loading
  alert: require('@/assets/finn/pose-alert.png'),         // worried
  laughCard: require('@/assets/finn/pose-laugh-card.png'),// celebrating, Home nudge
  wave: require('@/assets/finn/pose-wave.png'),           // peek, greeting
} as const;

export const FINN_POSE_FOR_MOOD: Record<Mood, keyof typeof FINN_POSE> = {
  happy: 'thumbsup', thinking: 'laptop', worried: 'alert', celebrating: 'laughCard',
};

/** Hero moments only: Welcome, session loading, goal complete. */
export const FINN_PLUSH = {
  welcome: require('@/assets/finn/plush-card.png'),
  loading: require('@/assets/finn/plush-wave.png'),
  complete: require('@/assets/finn/plush-celebrate.png'),
} as const;

export const FINN_LABEL: Record<Mood, string> = {
  happy: 'Finn looks happy',
  thinking: 'Finn is thinking',
  worried: 'Finn looks worried',
  celebrating: 'Finn is celebrating',
};
