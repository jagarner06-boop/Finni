import type { Mood } from '@finni/shared';

// Design tokens (Design System plan). Light mode only.
export const colors = {
  deep: '#0B2545',
  muted: '#5B6B82',
  foam: '#F3FAFF',
  surface: '#FFFFFF',
  ocean: '#2563EB',
  lagoon: '#22C1C3',
  coral: '#FF7A59',
  sun: '#FFC845',
  kelp: '#2FB37F',
  berry: '#E5486A',
} as const;

export const moodColor: Record<Mood, string> = {
  happy: colors.lagoon,
  thinking: colors.ocean,
  worried: colors.berry,
  celebrating: colors.sun,
};

export const radius = { card: 20, bubble: 22, pill: 999 } as const;

export const shadow = {
  shadowColor: colors.deep,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
