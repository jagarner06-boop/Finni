import { Feather } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius, shadow } from '@/theme/tokens';

const GRADIENT = `linear-gradient(180deg, ${colors.accentGradient[0]}, ${colors.accentGradient[2]})`;

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  autoFocus?: boolean;
};

/** Pill input with a round send button that lifts once there's something to send. */
export const Composer = forwardRef<TextInput, Props>(function Composer({ value, onChange, onSend, sending, autoFocus }, ref) {
  const [focused, setFocused] = useState(false);
  const ready = value.trim().length > 0 && !sending;

  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, focused && styles.focused]}>
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="Ask Finn"
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Ask Finn"
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => ready && onSend()}
          returnKeyType="send"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={onSend}
          style={[styles.send, ready ? styles.sendReady : styles.sendIdle]}>
          <Feather name="arrow-up" size={18} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, backgroundColor: colors.canvas },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 18,
    paddingRight: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.accent },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: 0 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendIdle: { backgroundColor: colors.accentDisabled, boxShadow: 'inset 0px 1px 2px rgba(20,33,61,0.12)' },
  sendReady: { experimental_backgroundImage: GRADIENT, boxShadow: shadow.primary },
});
