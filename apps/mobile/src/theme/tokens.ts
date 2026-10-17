// JS mirror of the @theme tokens in src/global.css, for places className can't
// reach (navigator options, icon colors, Reanimated styles).

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

export const fonts = {
  body: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
} as const;

export const radius = { card: 20, bubble: 22 } as const;

export const fontSize = { hero: 32, title: 24, body: 17, caption: 14 } as const;
