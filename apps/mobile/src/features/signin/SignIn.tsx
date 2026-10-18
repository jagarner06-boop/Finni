import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { FINN_PLUSH_FLOW } from '@/components/finn/assets';
import { FinnSphere } from '@/components/finn/FinnSphere';
import { TickBurst } from '@/components/finn/TickBurst';
import { Button } from '@/components/ui/Button';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { config } from '@/config';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { DECK_TILES } from '@/features/plan/deckTiles';
import { haptics } from '@/lib/haptics';
import { bob, dot, fade, float, hop, play, rise, spin } from '@/theme/flowMotion';
import { neutral } from '@/theme/palette';
import { colors, fonts } from '@/theme/tokens';

// Sign In handoff: shown right after deck 4. Google is the main path, email the fallback.
const HERO_H = 372;
const TILES = [
  { size: 54, radius: 18, icon: 24, pos: { left: 44, top: 50 }, rotate: '-10deg', bob: 4000, delay: 0 },
  { size: 50, radius: 17, icon: 22, pos: { right: 42, top: 38 }, rotate: '9deg', bob: 4400, delay: 600 },
  { size: 48, radius: 16, icon: 21, pos: { left: 22, top: 236 }, rotate: '8deg', bob: 4200, delay: 1100 },
  { size: 50, radius: 17, icon: 21, pos: { right: 20, top: 226 }, rotate: '-8deg', bob: 4600, delay: 300 },
].map((t) => ({ ...t, frames: bob(t.rotate, 5) }));
const FLOAT = float(8);
const RISE = rise(10);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignIn({ onContinue }: { onContinue: () => void }) {
  const { login, ready, status, user } = useAuth();
  const { profile } = useOnboarding();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const scale = Math.min(1, width / 390, Math.max(0.6, (height - 440) / HERO_H));
  const [view, setView] = useState<'home' | 'email'>('home');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demo = config.authMode === 'demo';
  const emailOk = EMAIL.test(email.trim());

  const signIn = async (opts?: { connection?: string; loginHint?: string }) => {
    setBusy(true);
    setError(null);
    try {
      if (await login(opts)) haptics.success();
    } catch (e) {
      setError((e as Error).message || 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const rest = { animationDuration: 250, animationFillMode: 'both' as const };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ height: HERO_H * scale, alignItems: 'center', marginTop: -8 }}>
          <View style={{ width: 390, height: HERO_H, transform: [{ scale }], transformOrigin: 'top' }}>
            <View style={{ position: 'absolute', left: 25, top: 16, width: 340, height: 340, borderRadius: 170, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.accentDisabled }} />
            <View
              style={{
                position: 'absolute', left: 69, top: 60, width: 252, height: 252, borderRadius: 126,
                experimental_backgroundImage: 'radial-gradient(circle at 36% 30%, #FFFFFF 0%, #EEF3FE 45%, #DCE7FD 100%)',
                boxShadow: 'inset 0px -10px 24px rgba(37,99,235,0.10), inset 0px 4px 2px rgba(255,255,255,0.9), 0px 20px 40px -24px rgba(37,99,235,0.45)',
              }}
            />
            {/* The four finished decks, each ticked. */}
            {DECK_TILES.map((d, i) => {
              const t = TILES[i];
              return (
                <Animated.View
                  key={d.label}
                  accessible={false}
                  style={{
                    position: 'absolute', ...t.pos, width: t.size, height: t.size, borderRadius: t.radius,
                    alignItems: 'center', justifyContent: 'center', backgroundColor: d.tint,
                    boxShadow: `0px 2px 0px ${d.lip}, 0px 8px 16px -8px ${d.glow}`,
                    transform: [{ rotate: t.rotate }],
                    ...play(reduced, t.frames, { animationDuration: t.bob, animationDelay: t.delay, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' }),
                  }}
                >
                  <Svg width={t.icon} height={t.icon} viewBox="0 0 24 24" fill="none" stroke={d.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d={d.icon} />
                  </Svg>
                  <View style={{ position: 'absolute', right: -6, top: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12l5 5 9-10" />
                    </Svg>
                  </View>
                </Animated.View>
              );
            })}
            <View style={{ position: 'absolute', left: 75, top: 62, width: 240, alignItems: 'center' }}>
              <Animated.View style={play(reduced, FLOAT, { animationDuration: 3600, animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out' })}>
                <Image accessibilityLabel="Finn looks happy, holding a shield" source={FINN_PLUSH_FLOW.shield} style={{ width: 240, height: 240 }} resizeMode="contain" />
              </Animated.View>
              <View style={{ width: 130, height: 14, marginTop: -26, borderRadius: 65, experimental_backgroundImage: 'radial-gradient(closest-side, rgba(20,33,61,0.22), transparent)' }} />
            </View>
          </View>
        </View>

        <View style={{ flex: 1, alignItems: 'center', gap: 12, paddingTop: 6, paddingHorizontal: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 30, paddingLeft: 10, paddingRight: 12, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, boxShadow: `0px 2px 0px ${colors.hairline}` }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {['#FF6B57', '#FFB020', '#7C6CF2', '#22B98A'].map((c) => (
                <View key={c} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
              ))}
            </View>
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink }}>Plan ready · 4 of 4 decks</Text>
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 30, lineHeight: 33, color: colors.ink, textAlign: 'center' }}>
            Save your plan with Finn
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted, textAlign: 'center', maxWidth: 310 }}>
            Sign in so your answers stay put. Pick up right where you left off on any device.
          </Text>
        </View>

        <View style={{ paddingTop: 16, paddingHorizontal: 24, paddingBottom: 12, gap: 12 }}>
          {view === 'home' ? (
            <Animated.View key="home" style={{ gap: 12, ...play(reduced, RISE, rest) }}>
              {demo ? (
                <PrimaryButton label="Save my plan" loading={busy} disabled={!ready} onPress={() => signIn()} />
              ) : (
                <GoogleButton disabled={!ready || busy} onPress={() => signIn({ connection: 'google-oauth2' })} />
              )}
              {!demo && <Button variant="ghost" label="Use email instead" disabled={busy} onPress={() => setView('email')} />}
              {error && (
                <Text accessibilityRole="alert" style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.dangerInk, textAlign: 'center' }}>
                  {error}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={colors.muted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3" />
                </Svg>
                <Text style={{ flexShrink: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' }}>
                  By continuing you agree to the <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>Terms</Text> and{' '}
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>Privacy Policy</Text>.
                </Text>
              </View>
            </Animated.View>
          ) : (
            <Animated.View key="email" style={{ gap: 10, ...play(reduced, RISE, rest) }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.muted }}>EMAIL</Text>
              <TextInput
                accessibilityLabel="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={() => emailOk && !busy && signIn({ loginHint: email.trim() })}
                style={{
                  height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: emailOk ? colors.accent : neutral.inputBorder,
                  backgroundColor: colors.surface, paddingHorizontal: 18, fontFamily: fonts.semibold, fontSize: 18, color: colors.ink,
                  boxShadow: 'inset 0px 2px 4px rgba(20,33,61,0.06)',
                }}
              />
              <PrimaryButton label="Continue with email" disabled={!emailOk || !ready} loading={busy} onPress={() => signIn({ loginHint: email.trim() })} />
              {error && (
                <Text accessibilityRole="alert" style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.dangerInk, textAlign: 'center' }}>
                  {error}
                </Text>
              )}
              <Button variant="ghost" label="Back to Google sign-in" disabled={busy} onPress={() => setView('home')} />
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>

      {busy && status !== 'signedIn' && <Signing reduced={reduced} email={view === 'email' ? email.trim() : null} />}
      {status === 'signedIn' && (
        <SignedIn
          reduced={reduced}
          firstName={user?.givenName || profile.firstName.trim() || 'friend'}
          name={user?.name || profile.firstName.trim() || 'You'}
          email={user?.email ?? null}
          onContinue={onContinue}
        />
      )}
    </SafeAreaView>
  );
}

function GoogleButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => haptics.light()}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56, borderRadius: 999, borderWidth: 1, borderColor: neutral.border, backgroundColor: colors.surface,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 3,
        opacity: disabled ? 0.6 : 1,
        transform: [{ translateY: pressed ? 3 : 0 }],
        boxShadow: pressed
          ? 'inset 0px 2px 4px rgba(20,33,61,0.12)'
          : `inset 0px -2px 0px rgba(20,33,61,0.04), 0px 3px 0px ${neutral.border}, 0px 10px 18px -10px rgba(20,33,61,0.3)`,
      })}
    >
      <GoogleMark size={22} />
      <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>Continue with Google</Text>
    </Pressable>
  );
}

function GoogleMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function Signing({ reduced, email }: { reduced: boolean; email: string | null }) {
  return (
    <Animated.View
      accessibilityViewIsModal
      style={{ position: 'absolute', inset: 0, zIndex: 6, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 32, ...play(reduced, fade, { animationDuration: 250 }) }}
    >
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{ position: 'absolute', inset: 0, borderRadius: 60, borderWidth: 3, borderColor: colors.disabledBg, borderTopColor: colors.accent, ...play(reduced, spin, { animationDuration: 1000, animationIterationCount: 'infinite', animationTimingFunction: 'linear' }) }}
        />
        <FinnSphere size={96} head="curious" />
      </View>
      <Text accessibilityRole="alert" style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.ink }}>Signing you in…</Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' }}>
        Saving your plan to {email || 'your account'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {[1, 0.7, 0.45].map((opacity, i) => (
          <Animated.View
            key={i}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, opacity, ...play(reduced, dot, { animationDuration: 1200, animationDelay: i * 150, animationIterationCount: 'infinite' }) }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

function SignedIn({
  reduced,
  firstName,
  name,
  email,
  onContinue,
}: {
  reduced: boolean;
  firstName: string;
  name: string;
  email: string | null;
  onContinue: () => void;
}) {
  return (
    <Animated.View style={{ position: 'absolute', inset: 0, zIndex: 6, backgroundColor: colors.canvas, ...play(reduced, fade, { animationDuration: 250 }) }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 28 }}>
          <View>
            <Animated.View style={{ width: 112, height: 112, borderRadius: 56, padding: 3, backgroundColor: colors.accent, transformOrigin: 'bottom', ...play(reduced, hop, { animationDuration: 700, animationDelay: 100, animationFillMode: 'both' }) }}>
              <View style={{ flex: 1, borderRadius: 53, borderWidth: 3, borderColor: colors.canvas, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <FinnSphere size={100} head="excited" />
              </View>
            </Animated.View>
            <View style={{ position: 'absolute', right: -30, top: -10 }}>
              <TickBurst />
            </View>
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.bold, fontSize: 28, lineHeight: 31, color: colors.ink, textAlign: 'center' }}>
            You&apos;re in, {firstName}.
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center' }}>
            Your plan is saved to your account. Sign in anywhere and it&apos;ll be waiting.
          </Text>
          <View style={{ width: '100%', marginTop: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 20, overflow: 'hidden', boxShadow: 'inset 0px 1px 0px #FFFFFF, 0px 1px 2px rgba(20,33,61,0.04), 0px 8px 20px -10px rgba(20,33,61,0.14)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: colors.accentPressed }}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{name}</Text>
                {email && <Text numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{email}</Text>}
              </View>
              <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 999, backgroundColor: DECK_TILES[3].tint, justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: DECK_TILES[3].ink }}>Saved</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.hairline }}>
              {DECK_TILES.map((d) => (
                <View key={d.label} style={{ height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: d.tint, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: d.ink }}>{d.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={{ paddingTop: 12, paddingHorizontal: 24, paddingBottom: 12 }}>
          <PrimaryButton label="Build my plan" onPress={onContinue} />
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
