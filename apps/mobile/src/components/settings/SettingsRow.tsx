import { Feather } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

/** One grouped settings row: icon tile, title, value, and a chevron or a switch. */
export function SettingsRow({
  icon,
  title,
  value,
  onPress,
  toggle,
  destructive = false,
  children,
}: {
  icon: FeatherIconName;
  title: string;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  destructive?: boolean;
  /** Replaces the title/value text (inline editing). */
  children?: ReactNode;
}) {
  const body = (
    <>
      <View style={styles.tile}>
        <Feather name={icon} size={16} color={destructive ? colors.dangerInk : colors.accentPressed} />
      </View>
      {children ?? (
        <View style={styles.text}>
          <Text style={[styles.title, destructive && styles.destructive]}>{title}</Text>
          {value ? (
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
        </View>
      )}
      {toggle && (
        <Switch
          accessibilityLabel={title}
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.accent, false: colors.disabledBg }}
        />
      )}
      {onPress && !toggle && <Feather name="chevron-right" size={18} color={colors.placeholder} />}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

/** White rounded group with hairline separators between rows. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  const rows = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);
  return (
    <View style={styles.groupWrap}>
      {title && <Text style={styles.micro}>{title}</Text>}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 && styles.separator}>
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 },
  pressed: { backgroundColor: colors.canvas },
  tile: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  destructive: { color: colors.dangerInk },
  value: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.muted, fontVariant: ['tabular-nums'] },
  groupWrap: { gap: 6 },
  micro: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.muted, marginLeft: 4 },
  group: { borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface, overflow: 'hidden' },
  separator: { borderTopWidth: 1, borderColor: colors.hairline },
});
