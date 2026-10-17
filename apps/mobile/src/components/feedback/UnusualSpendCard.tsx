import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { FinnSphere } from "@/components/finn/FinnSphere";
import { MotionView } from "@/components/ui/MotionView";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { haptics } from "@/lib/haptics";
import { palette } from "@/theme/palette";
import { colors, fonts, shadow } from "@/theme/tokens";

export function UnusualSpendCard({
  title,
  body,
  amount,
  history,
  onDismiss,
  onFlag,
}: {
  title: string;
  body: string;
  amount?: string;
  history?: { label: string; value: number }[];
  onDismiss: () => Promise<unknown>;
  onFlag: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => haptics.warning(), []);
  return (
    <MotionView
      effect="shake"
      style={{
        padding: 18,
        gap: 16,
        borderRadius: 24,
        backgroundColor: colors.surface,
        boxShadow: shadow.card,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <FinnSphere size={52} head="surprised" ring="coral" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontFamily: fonts.semibold,
              fontSize: 12,
              color: palette.coral.ink,
              letterSpacing: 0.48,
            }}
          >
            UNUSUAL SPEND
          </Text>
          <Text
            style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}
          >
            {title}
          </Text>
        </View>
        {amount && (
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: 20,
              color: colors.ink,
              fontVariant: ["tabular-nums"],
            }}
          >
            {amount}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 21,
          color: colors.ink,
        }}
      >
        {body}
      </Text>
      {history && (
        <View
          style={{
            flexDirection: "row",
            height: 110,
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          {history.map((bar, i) => (
            <View key={`${bar.label}-${i}`} style={{ flex: 1, gap: 6 }}>
              <MotionView
                delay={250 + i * 60}
                style={{
                  height: Math.max(
                    4,
                    (bar.value / Math.max(1, ...history.map((b) => b.value))) *
                      90,
                  ),
                  borderRadius: 8,
                  backgroundColor:
                    i === history.length - 1
                      ? palette.coral.base
                      : colors.accentDisabled,
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  textAlign: "center",
                }}
              >
                {bar.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      {message ? (
        <MotionView>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.muted }}
          >
            {message}
          </Text>
        </MotionView>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label="That was me"
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  await onDismiss();
                  setMessage("Alert dismissed.");
                } catch {
                  setBusy(false);
                  setMessage(
                    "Could not dismiss this alert. Try again from Activity.",
                  );
                }
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Flag it"
              size="md"
              disabled={busy}
              onPress={onFlag}
            />
          </View>
        </View>
      )}
    </MotionView>
  );
}
