import { palette } from '@/theme/palette';

// The four onboarding decks as the sign-in and plan screens draw them.
export const DECK_TILES = [
  { label: 'Basics', color: palette.coral.base, tint: palette.coral.tint, ink: palette.coral.ink, lip: '#F6CFC7', glow: 'rgba(255,107,87,0.5)', icon: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5' },
  { label: 'Income', color: palette.sun.iconStroke, tint: palette.sun.tint, ink: palette.sun.ink, lip: palette.sun.lip, glow: 'rgba(224,148,0,0.5)', icon: 'M12 3v18M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8' },
  { label: 'Style', color: palette.lilac.base, tint: palette.lilac.tint, ink: palette.lilac.ink, lip: '#D9D4FB', glow: 'rgba(124,108,242,0.5)', icon: 'M5 21V4h11l-2 4 2 4H5' },
  { label: 'Bank', color: palette.mint.base, tint: palette.mint.tint, ink: palette.mint.ink, lip: '#BFEBDB', glow: 'rgba(34,185,138,0.5)', icon: 'M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18' },
] as const;
