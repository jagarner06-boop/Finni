import type { Mood } from '@finni/shared';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnRiveHead, type FinnRiveHandle } from '@/components/finn/FinnRive';
import { useFinnReaction } from '@/components/finn/useFinnReaction';
import { colors, fonts } from '@/theme/tokens';

const THINK_DELAY = 300;

/**
 * Agent screen's expressive element: a 64pt Finn. Ask → think → answer: 300ms after sending he turns
 * curious and rocks; when the reply lands he takes its mood and nods.
 */
export function AgentHeader({ sending, replyMood }: { sending: boolean; replyMood: Mood }) {
  const [thinking, setThinking] = useState(false);
  const rive = useRef<FinnRiveHandle>(null);
  const finn = useFinnReaction(); // drives the PNG fallback only; Rive animates itself
  const wasSending = useRef(sending);
  const { startRock, stopRock, nod } = finn;

  useEffect(() => {
    if (!sending) return;
    const t = setTimeout(() => {
      setThinking(true);
      startRock();
    }, THINK_DELAY);
    return () => {
      clearTimeout(t);
      setThinking(false);
    };
  }, [sending, startRock]);

  useEffect(() => {
    const replied = wasSending.current && !sending;
    wasSending.current = sending;
    if (!replied) return;
    stopRock();
    nod();
    rive.current?.fire('nod');
  }, [sending, stopRock, nod]);

  const mood: Mood = sending && thinking ? 'thinking' : replyMood;

  return (
    <View style={styles.header}>
      <FinnRiveHead
        ref={rive}
        mood={mood}
        size={64}
        fallback={
          <Animated.View style={finn.style}>
            <FinnAvatar mood={mood} size={64} animated />
          </Animated.View>
        }
      />
      <Text style={styles.name} accessibilityRole="header">
        Finn
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 4, paddingTop: 4, paddingBottom: 8 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
});
