import { Easing, FadeIn, Keyframe } from "react-native-reanimated";

// Separate from legacy Finn reactions: the old deposit bob and 26pt hop keep their behavior.
export type Entrance =
  "rise" | "pop" | "bigPop" | "hop" | "shake" | "drop" | "out";
export function entrance(name: Entrance, reduced: boolean, delay = 0) {
  if (reduced) return FadeIn.duration(150).delay(delay);
  const ease = Easing.out(Easing.cubic);
  switch (name) {
    case "rise":
      return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: 10 }] },
        100: { opacity: 1, transform: [{ translateY: 0 }], easing: ease },
      })
        .duration(300)
        .delay(delay);
    case "pop":
      return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: 8 }, { scale: 0.94 }] },
        70: {
          opacity: 1,
          transform: [{ translateY: -2 }, { scale: 1.01 }],
          easing: ease,
        },
        100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
      })
        .duration(320)
        .delay(delay);
    case "bigPop":
      return new Keyframe({
        0: { opacity: 0, transform: [{ scale: 0.6 }] },
        60: { opacity: 1, transform: [{ scale: 1.06 }], easing: ease },
        100: { opacity: 1, transform: [{ scale: 1 }] },
      })
        .duration(420)
        .delay(delay);
    case "hop":
      return new Keyframe({
        0: { transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
        18: {
          transform: [{ translateY: 0 }, { scaleX: 1.08 }, { scaleY: 0.88 }],
        },
        45: {
          transform: [{ translateY: -22 }, { scaleX: 0.94 }, { scaleY: 1.08 }],
          easing: ease,
        },
        72: {
          transform: [{ translateY: 0 }, { scaleX: 1.06 }, { scaleY: 0.92 }],
        },
        100: { transform: [{ translateY: 0 }, { scaleX: 1 }, { scaleY: 1 }] },
      })
        .duration(700)
        .delay(delay);
    case "shake":
      return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: 16 }, { translateX: 0 }] },
        40: { opacity: 1, transform: [{ translateY: 0 }, { translateX: 0 }] },
        55: { transform: [{ translateY: 0 }, { translateX: -5 }] },
        70: { transform: [{ translateY: 0 }, { translateX: 4 }] },
        85: { transform: [{ translateY: 0 }, { translateX: -2 }] },
        100: { transform: [{ translateY: 0 }, { translateX: 0 }] },
      })
        .duration(600)
        .delay(delay);
    case "drop":
      return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: -24 }, { scale: 0.96 }] },
        70: {
          opacity: 1,
          transform: [{ translateY: 3 }, { scale: 1.01 }],
          easing: ease,
        },
        100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
      })
        .duration(360)
        .delay(delay);
    case "out":
      return new Keyframe({
        0: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
        100: {
          opacity: 0,
          transform: [{ translateY: -14 }, { scale: 0.96 }],
          easing: Easing.in(Easing.cubic),
        },
      })
        .duration(220)
        .delay(delay);
  }
}
