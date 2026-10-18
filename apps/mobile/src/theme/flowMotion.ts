import { css, cubicBezier, type CSSAnimationTimingFunction, type CSSKeyframesRule } from 'react-native-reanimated';

// Keyframes from the Sign In and Plan Loading handoffs (Reanimated CSS animations).

export const float = (px: number) =>
  css.keyframes({ '0%': { transform: [{ translateY: 0 }] }, '50%': { transform: [{ translateY: -px }] }, '100%': { transform: [{ translateY: 0 }] } });

/** Tilted tile bob; the tilt is part of the frames because RN has no CSS variables. */
export const bob = (rotate: string, px: number) =>
  css.keyframes({
    '0%': { transform: [{ translateY: 0 }, { rotate }] },
    '50%': { transform: [{ translateY: -px }, { rotate }] },
    '100%': { transform: [{ translateY: 0 }, { rotate }] },
  });

export const hop = css.keyframes({
  '0%': { transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
  '18%': { transform: [{ translateY: 0 }, { scaleX: 1.08 }, { scaleY: 0.9 }] },
  '45%': { transform: [{ translateY: -24 }, { scaleX: 0.95 }, { scaleY: 1.06 }] },
  '72%': { transform: [{ translateY: 0 }, { scaleX: 1.05 }, { scaleY: 0.94 }] },
  '100%': { transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
});

export const shake = css.keyframes({
  '0%': { transform: [{ translateX: 0 }] },
  '20%': { transform: [{ translateX: -6 }] },
  '40%': { transform: [{ translateX: 5 }] },
  '60%': { transform: [{ translateX: -3 }] },
  '80%': { transform: [{ translateX: 2 }] },
  '100%': { transform: [{ translateX: 0 }] },
});

export const rise = (px = 10) =>
  css.keyframes({ from: { opacity: 0, transform: [{ translateY: px }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } });

export const pop = css.keyframes({
  '0%': { opacity: 0, transform: [{ scale: 0.6 }] },
  '60%': { opacity: 1, transform: [{ scale: 1.08 }] },
  '100%': { opacity: 1, transform: [{ scale: 1 }] },
});

export const fade = css.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
export const pulse = css.keyframes({ '0%': { opacity: 0.5 }, '50%': { opacity: 1 }, '100%': { opacity: 0.5 } });
export const spin = css.keyframes({ from: { transform: [{ rotate: '0deg' }] }, to: { transform: [{ rotate: '360deg' }] } });
export const dot = css.keyframes({
  '0%': { transform: [{ translateY: 0 }] },
  '30%': { transform: [{ translateY: -3 }] },
  '60%': { transform: [{ translateY: 0 }] },
  '100%': { transform: [{ translateY: 0 }] },
});
export const tick = css.keyframes({
  '0%': { opacity: 0, transform: [{ scale: 0 }] },
  '30%': { opacity: 1, transform: [{ scale: 1.2 }] },
  '65%': { opacity: 1, transform: [{ scale: 1 }] },
  '100%': { opacity: 0, transform: [{ scale: 1 }] },
});

/** A burst particle flying out from the centre. */
export const burst = (dx: number, dy: number) =>
  css.keyframes({
    '0%': { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0.4 }] },
    '20%': { opacity: 1 },
    '100%': { opacity: 0, transform: [{ translateX: dx }, { translateY: dy }, { scale: 1 }] },
  });

export const easeOutBack = cubicBezier(0.3, 1.6, 0.5, 1);
export const easeInBack = cubicBezier(0.55, -0.35, 0.7, 1);
export const sheetEase = cubicBezier(0.2, 0.9, 0.3, 1);
export const burstEase = cubicBezier(0.2, 0.8, 0.3, 1);

interface PlaySettings {
  animationDuration: number;
  animationDelay?: number;
  animationIterationCount?: 'infinite' | number;
  animationTimingFunction?: CSSAnimationTimingFunction;
  animationFillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/** Animation props, or none under Reduce Motion (the element rests in its final state). */
export function play(reduced: boolean, name: CSSKeyframesRule, settings: PlaySettings) {
  return reduced ? undefined : { animationName: name, ...settings };
}
