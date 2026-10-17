// apps/mobile/src/theme/palette.ts — expanded palette for onboarding + motion kit.
// Import alongside tokens.ts. Do not add any other colors.

export const palette = {
  coral: { base: '#FF6B57', tint: '#FFEDE9', ink: '#B23A28' },
  sun:   { base: '#FFB020', tint: '#FFF5DC', ink: '#8A5A00', iconStroke: '#E09400', lip: '#F4DFA6' },
  lilac: { base: '#7C6CF2', tint: '#EFEDFE', ink: '#4E3FC4', lip: '#5A4BD0' },
  mint:  { base: '#22B98A', tint: '#E1F7EF', ink: '#137255' },
  sky:   { base: '#1FA8E8', tint: '#E2F4FC', ink: '#0B6E9C' },
} as const;

export type PaletteKey = keyof typeof palette;

// One color per onboarding deck. A deck uses ONLY its own color (+ cobalt for actions/selection + neutrals).
export const deckColor = {
  basics: 'coral',
  income: 'sun',
  personality: 'lilac',
  connect: 'mint',
} as const satisfies Record<string, PaletteKey>;

// Neutrals used by these screens that are not in tokens.ts
export const neutral = {
  border: '#D9D4C9',        // unselected option / secondary button border
  lip: '#E6E1D6',           // secondary button 2pt lip, inactive progress segment
  inputBorder: '#E2DDD2',   // empty text input
  disabledBg: '#E3E8F0',
  disabledText: '#7D8AA0',
  toggleOff: '#D9DEE7',
  radioOff: '#C3CCDA',
  typingDot: '#C3CCDA',
  confettiCream: '#F4E9D2',
  selectedBg: '#F5F8FF',    // option card selected background
  selectedLip: '#CBD9F8',
} as const;

// Confetti colors = [deck/card color x2, deck color at 60% alpha, cobalt, cream]
export const confettiColors = (base: string) =>
  [base, base, base + '99', '#2563EB', neutral.confettiCream] as const;

export const onboardingVisual = {
  personalityGradient: 'linear-gradient(135deg, #9487F7, #6152DE)',
  personalityShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 3px 0 #4A3CB8, 0 18px 30px -14px rgba(124,108,242,.5)',
  presetGradient: 'linear-gradient(180deg, #FFFBF0, #FFF1CC)',
  selectedHabitShadow: '0 3px 0 #5A4BD0, 0 8px 16px -8px rgba(124,108,242,.6)',
} as const;
