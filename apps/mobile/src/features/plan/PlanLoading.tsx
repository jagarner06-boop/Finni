import { useEffect, useRef, useState } from 'react';
import { Image, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { FINN_PLUSH_FLOW } from '@/components/finn/assets';
import { FinnSphere } from '@/components/finn/FinnSphere';
import { TickBurst } from '@/components/finn/TickBurst';
import { Button } from '@/components/ui/Button';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { haptics } from '@/lib/haptics';
import { bob, burst, burstEase, easeInBack, easeOutBack, float, hop, play, pop, pulse, rise, shake, spin } from '@/theme/flowMotion';
import { neutral } from '@/theme/palette';
import { colors, fonts } from '@/theme/tokens';
import { DECK_TILES } from './deckTiles';

// Plan Loading handoff: a 390×500 stage centred on Finn at (195, 250).
const STAGE_W = 390, STAGE_H = 500, CX = 195, CY = 250;
const RING_R = 128, RING_C = 2 * Math.PI * RING_R;
/** One full run when every step finishes in time; a slow step holds its segment. */
const DURATION = 7000;
const STATUS = ['Reading your basics', 'Mapping your paychecks', 'Tuning to your money style', 'Syncing your bank'];
const TILE_POS = [
  { x: 72, y: 96, rotate: '-10deg', bob: 4000 },
  { x: 318, y: 92, rotate: '9deg', bob: 4400 },
  { x: 56, y: 400, rotate: '8deg', bob: 4200 },
  { x: 334, y: 404, rotate: '-8deg', bob: 4600 },
].map((t) => ({ ...t, frames: bob(t.rotate, 6) }));
const BURST = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + 0.2, d = 150 + (i % 3) * 22, size = i % 2 ? 8 : 11;
  return {
    size,
    round: i % 3 !== 0,
    color: i % 5 === 0 ? colors.accent : DECK_TILES[i % 4].color,
    delay: (i % 4) * 30,
    frames: burst(Math.cos(a) * d, Math.sin(a) * d),
  };
});
const FLOAT = float(8);
const RISE = rise(12);
const ease = (x: number) => 1 - Math.pow(1 - x, 2.2);

type Phase = 'loading' | 'done' | 'error';

export function PlanLoading({
  completed,
  error,
  canSkip,
  onRetry,
  onSkip,
  onDone,
}: {
  /** Steps whose real work has finished, 0–4. */
  completed: number;
  error: boolean;
  canSkip: boolean;
  onRetry: () => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const scale = Math.min(1, width / STAGE_W, Math.max(0.6, (height - 360) / STAGE_H));
  const [p, setP] = useState(0);
  const cap = completed >= 4 ? 1 : (completed + 0.9) / 4;
  const capRef = useRef(cap);
  useEffect(() => {
    capRef.current = cap;
  }, [cap]);

  const phase: Phase = error ? 'error' : p >= 1 ? 'done' : 'loading';
  const loading = phase === 'loading';

  // Time drives the bar, but each segment waits for its step's real work.
  useEffect(() => {
    if (!loading) return;
    let last = Date.now();
    const iv = setInterval(() => {
      const now = Date.now(), dt = now - last;
      last = now;
      setP((old) => Math.max(old, Math.min(capRef.current, old + dt / DURATION)));
    }, 32);
    return () => clearInterval(iv);
  }, [loading]);

  const step = Math.min(3, Math.floor(p * 4));
  // The eased segment never shows a waiting step as finished.
  const shown = phase === 'done' ? 1 : Math.min(cap, (step + ease(Math.min(1, p * 4 - step))) / 4);
  const failedAt = Math.min(3, completed);

  // Finn's orb bumps as each card lands.
  const [bump, setBump] = useState(false);
  const lastStep = useRef(0);
  useEffect(() => {
    if (step <= lastStep.current) return;
    lastStep.current = step;
    setBump(true);
    const t = setTimeout(() => setBump(false), 220);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (phase === 'done') haptics.success();
    if (phase === 'error') haptics.warning();
  }, [phase]);

  const tileState = (i: number) => {
    const done = phase === 'done' || (phase === 'error' ? i < failedAt : i < step);
    return { done, active: loading && i === step, bad: phase === 'error' && i === failedAt };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View style={{ height: STAGE_H * scale, alignItems: 'center' }}>
        <View style={{ width: STAGE_W, height: STAGE_H, transform: [{ scale }], transformOrigin: 'top' }}>
          {/* Deck-coloured dots orbit while Finn works. */}
          {DECK_TILES.map((t, i) => (
            <Animated.View
              key={t.label}
              style={{ position: 'absolute', left: CX, top: CY, width: 0, height: 0, opacity: loading ? 1 : 0, transform: [{ rotate: `${i * 90}deg` }], transitionProperty: 'opacity', transitionDuration: 400 }}
            >
              <Animated.View style={{ width: 0, height: 0, ...play(reduced, spin, { animationDuration: 5000, animationIterationCount: 'infinite', animationTimingFunction: 'linear' }) }}>
                <View style={{ position: 'absolute', left: 150 - (10 - i) / 2, top: -(10 - i) / 2, width: 10 - i, height: 10 - i, borderRadius: 5, backgroundColor: t.color }} />
              </Animated.View>
            </Animated.View>
          ))}

          <View style={{ position: 'absolute', left: CX - 138, top: CY - 138, width: 276, height: 276 }}>
            <Svg width={276} height={276} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={138} cy={138} r={RING_R} fill="none" stroke={neutral.lip} strokeWidth={8} />
              <Circle
                cx={138}
                cy={138}
                r={RING_R}
                fill="none"
                stroke={phase === 'error' ? colors.danger : colors.accent}
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - shown)}
              />
            </Svg>
            <Animated.View
              style={{
                position: 'absolute', left: 22, top: 22, width: 232, height: 232, borderRadius: 116,
                experimental_backgroundImage: 'radial-gradient(circle at 36% 30%, #FFFFFF 0%, #EEF3FE 45%, #DCE7FD 100%)',
                boxShadow: 'inset 0px -10px 24px rgba(37,99,235,0.10), inset 0px 4px 2px rgba(255,255,255,0.9), 0px 20px 40px -24px rgba(37,99,235,0.45)',
                transform: [{ scale: bump ? 1.06 : phase === 'done' ? 1.04 : 1 }],
                transitionProperty: 'transform', transitionDuration: 220, transitionTimingFunction: easeOutBack,
              }}
            />
          </View>

          {DECK_TILES.map((t, i) => {
            const pos = TILE_POS[i], s = tileState(i);
            return (
              <Animated.View
                key={t.label}
                style={{ position: 'absolute', left: pos.x - 30, top: pos.y - 30, width: 60, height: 60, zIndex: s.done ? 1 : 4, transform: [{ rotate: pos.rotate }], ...play(reduced, pos.frames, { animationDuration: pos.bob, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }) }}
              >
                <Animated.View style={s.bad ? play(reduced, shake, { animationDuration: 500 }) : undefined}>
                  <Animated.View
                    style={{
                      width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: t.tint, boxShadow: `0px 2px 0px ${t.lip}, 0px 8px 16px -8px ${t.glow}`,
                      opacity: s.done ? 0 : 1,
                      transform: s.done
                        ? [{ translateX: CX - pos.x }, { translateY: CY - pos.y }, { scale: 0.2 }]
                        : [{ translateX: 0 }, { translateY: 0 }, { scale: s.active ? 1.12 : 1 }],
                      transitionProperty: ['transform', 'opacity'], transitionDuration: [600, 350], transitionDelay: [0, 300],
                      transitionTimingFunction: [easeInBack, 'ease'],
                    }}
                  >
                    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d={t.icon} />
                    </Svg>
                    {s.active && (
                      <Animated.View style={{ position: 'absolute', inset: -6, borderRadius: 24, borderWidth: 2, borderColor: t.color, ...play(reduced, pulse, { animationDuration: 1000, animationIterationCount: 'infinite' }) }} />
                    )}
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            );
          })}

          {phase === 'done' && (
            <View pointerEvents="none" style={{ position: 'absolute', left: CX, top: CY, width: 0, height: 0, zIndex: 1 }}>
              {!reduced && BURST.map((b, i) => (
                <Animated.View
                  key={i}
                  style={{ position: 'absolute', left: -b.size / 2, top: -b.size / 2, width: b.size, height: b.size, borderRadius: b.round ? b.size / 2 : 3, backgroundColor: b.color, opacity: 0, animationName: b.frames, animationDuration: 900, animationDelay: b.delay, animationTimingFunction: burstEase, animationFillMode: 'both' }}
                />
              ))}
              <View style={{ position: 'absolute', left: 88, top: -124 }}>
                <TickBurst />
              </View>
            </View>
          )}

          <View pointerEvents="none" style={{ position: 'absolute', left: CX - 110, top: CY - 118, width: 220, height: 220, alignItems: 'center', zIndex: 2 }}>
            {phase === 'loading' && (
              <Animated.View style={play(reduced, FLOAT, { animationDuration: 3200, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' })}>
                <Image accessibilityLabel="Finn is thinking" source={FINN_PLUSH_FLOW.thinking} style={{ width: 210, height: 210 }} resizeMode="contain" />
              </Animated.View>
            )}
            {phase === 'done' && (
              <Animated.View style={{ transformOrigin: 'bottom', ...play(reduced, hop, { animationDuration: 700, animationDelay: 50, animationFillMode: 'both' }) }}>
                <Image accessibilityLabel="Finn is celebrating" source={FINN_PLUSH_FLOW.celebrate} style={{ width: 210, height: 210 }} resizeMode="contain" />
              </Animated.View>
            )}
            {phase === 'error' && (
              <Animated.View style={{ marginTop: 34, ...play(reduced, pop, { animationDuration: 400, animationFillMode: 'both' }) }}>
                <FinnSphere size={150} head="worried" />
              </Animated.View>
            )}
          </View>
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 12 }}>
        {phase === 'loading' && (
          <View style={{ flex: 1, alignItems: 'center', gap: 14 }}>
            <Text
              accessibilityRole="progressbar"
              accessibilityLabel="Building your plan"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(shown * 100) }}
              style={{ fontFamily: fonts.bold, fontSize: 44, lineHeight: 48, color: colors.ink, fontVariant: ['tabular-nums'] }}
            >
              {Math.round(shown * 100)}%
            </Text>
            <View accessibilityLiveRegion="polite" style={{ width: '100%', height: 26 }}>
              {STATUS.map((text, i) => (
                <Animated.Text
                  key={text}
                  accessibilityElementsHidden={i !== step}
                  importantForAccessibility={i === step ? 'auto' : 'no-hide-descendants'}
                  style={{
                    position: 'absolute', left: 0, right: 0, textAlign: 'center',
                    fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, color: colors.ink,
                    opacity: i === step ? 1 : 0,
                    transform: [{ translateY: i < step ? -10 : i > step ? 10 : 0 }],
                    transitionProperty: ['opacity', 'transform'], transitionDuration: 250,
                  }}
                >
                  {text}
                </Animated.Text>
              ))}
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 290 }}>
              Finn is putting your answers together. This takes a few seconds.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 'auto' }}>
              {DECK_TILES.map((t, i) => {
                const s = tileState(i);
                return (
                  <Animated.View
                    key={t.label}
                    style={{
                      height: 28, paddingHorizontal: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: s.done ? colors.surface : colors.warmTrack,
                      boxShadow: s.done ? `0px 0px 0px 1px ${colors.hairline}, 0px 2px 0px ${colors.hairline}` : 'inset 0px 1px 2px rgba(20,33,61,0.08)',
                      transitionProperty: 'backgroundColor', transitionDuration: 300,
                    }}
                  >
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.done || s.active ? t.color : neutral.radioOff }} />
                    <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: s.done ? colors.ink : colors.placeholder }}>{t.label}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

        {phase === 'done' && (
          <View style={{ flex: 1, alignItems: 'center', gap: 12 }}>
            <Animated.Text style={{ fontFamily: fonts.bold, fontSize: 30, lineHeight: 33, color: colors.ink, textAlign: 'center', ...play(reduced, RISE, { animationDuration: 400, animationDelay: 250, animationFillMode: 'both' }) }}>
              Your plan is ready
            </Animated.Text>
            <Animated.Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', maxWidth: 300, ...play(reduced, RISE, { animationDuration: 400, animationDelay: 350, animationFillMode: 'both' }) }}>
              Finn has everything from your four decks. Let&apos;s take a look.
            </Animated.Text>
            <Animated.View style={{ width: '100%', marginTop: 'auto', ...play(reduced, RISE, { animationDuration: 400, animationDelay: 500, animationFillMode: 'both' }) }}>
              <PrimaryButton label="See my plan" onPress={onDone} />
            </Animated.View>
          </View>
        )}

        {phase === 'error' && (
          <Animated.View style={{ flex: 1, alignItems: 'center', gap: 12, ...play(reduced, RISE, { animationDuration: 300, animationFillMode: 'both' }) }}>
            <Text accessibilityRole="alert" style={{ fontFamily: fonts.bold, fontSize: 26, lineHeight: 30, color: colors.ink, textAlign: 'center' }}>
              {failedAt === 0 ? "We couldn't reach Finni" : "We couldn't reach your bank"}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 300 }}>
              Your basics, income and money style are saved. Nothing was connected and no money moved.
            </Text>
            <View style={{ width: '100%', marginTop: 'auto', gap: 6 }}>
              <PrimaryButton label="Try again" onPress={onRetry} />
              {canSkip && <Button variant="ghost" label="Skip bank for now" onPress={onSkip} />}
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
