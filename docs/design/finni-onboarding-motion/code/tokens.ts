// apps/mobile/src/theme/tokens.ts — Finni design system v2
import type { Mood } from '@finni/shared';

export const colors = {
  canvas: '#FAF8F3',
  surface: '#FFFFFF',
  hairline: '#EDEAE3',
  warmTrack: '#F1EEE7',
  ink: '#14213D',
  muted: '#5B6B82',
  placeholder: '#7D8AA0',

  accent: '#2563EB',
  accentTint: '#E8F0FE',
  accentPressed: '#1E4FD0',
  accentLip: '#1B47B5',
  accentDisabled: '#C9D6F5',
  accentGradient: ['#3D78F2', '#2563EB', '#2159DC'] as const, // stops 0 / .6 / 1, 180°

  belly: '#FBF6EC',
  bellySphere: ['#FFFFFF', '#FBF6EC', '#EADFC8'] as const, // radial at 34% 26%

  heroFrom: '#1E3A8A',
  heroTo: '#2F55C8',
  heroLip: '#172E6E',

  danger: '#E5484D', dangerInk: '#C62F36', dangerTint: '#FBE9E9',
  warning: '#F5A524', warningInk: '#9A5B00', warningTint: '#FEF4E2',
  success: '#2FB37F', successInk: '#1F7A55',

  scrim: 'rgba(20,33,61,0.42)',
} as const;

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export const fontSize = { hero: 32, title: 24, section: 20, body: 17, label: 15, caption: 14, micro: 12 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
export const radius = { tile: 12, card: 20, bubble: 22, bubbleTail: 6, sheet: 28, pill: 999 } as const;
export const hitTarget = 44;

export const moodRing: Record<Mood, string | null> = {
  happy: null,
  thinking: colors.accent,
  worried: colors.warning,
  celebrating: colors.success,
};

export const utilizationColor = (pct: number) =>
  pct <= 30 ? colors.success : pct <= 60 ? colors.warning : colors.danger;

// RN 0.76+ boxShadow strings (match the HTML reference exactly)
export const shadow = {
  card: '0px 1px 2px rgba(20,33,61,0.04), 0px 8px 20px -10px rgba(20,33,61,0.14)',
  primary: 'inset 0px 1px 0px rgba(255,255,255,0.3), inset 0px -1px 0px rgba(10,30,90,0.25), 0px 3px 0px #1B47B5, 0px 8px 16px -6px rgba(37,99,235,0.5)',
  primaryPressed: 'inset 0px 2px 4px rgba(10,30,90,0.35)',
  secondary: 'inset 0px -2px 0px rgba(20,33,61,0.05), 0px 2px 0px #E6E1D6, 0px 4px 8px -4px rgba(20,33,61,0.12)',
  chip: 'inset 0px 1px 0px #FFFFFF, 0px 1px 0px #CBD9F8, 0px 3px 6px -3px rgba(37,99,235,0.25)',
  well: 'inset 0px 2px 5px rgba(20,33,61,0.18), 0px 1px 0px #FFFFFF',
  sphere: 'inset 0px -4px 8px rgba(130,100,50,0.14), inset 0px 2px 1px rgba(255,255,255,0.9), 0px 4px 10px -3px rgba(20,33,61,0.22)',
  hero: 'inset 0px 1px 0px rgba(255,255,255,0.2), inset 0px -2px 0px rgba(0,0,0,0.12), 0px 3px 0px #172E6E, 0px 18px 30px -14px rgba(30,58,138,0.6)',
  toast: '0px 10px 24px -8px rgba(20,33,61,0.5)',
} as const;

export const motion = {
  micro: 150,
  standard: 250,
  hero: 400,
  pressDown: 90,
  hold: 600,
  finnSpring: { damping: 14, stiffness: 180 },
} as const;
