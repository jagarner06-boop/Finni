import { useState } from "react";
import { Image, Text, TextInput, View } from "react-native";
import { FinnSays } from "@/components/finn/FinnSays";
import { FINN_PLUSH } from "@/components/finn/assets";
import { LoopView } from "@/components/ui/MotionView";
import { OptionCard } from "@/components/ui/OptionCard";
import { colors, fonts, shadow } from "@/theme/tokens";
import { neutral } from "@/theme/palette";
import { DeckShell } from "./DeckShell";
import { DoneScreen } from "./DoneScreen";
import { useOnboarding } from "./OnboardingProvider";
import { COPY, LIFE_STAGES } from "./content";
import { canContinue } from "./logic";
import { IconTile, layout, Micro } from "./presentation";

export default function BasicsDeck({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { profile: p, update } = useOnboarding();
  const title = [
    COPY.basics.introTitle,
    COPY.basics.askName,
    COPY.basics.askStage,
    COPY.basics.doneTitle,
  ][step];
  const next = () => {
    if (!canContinue("basics", step, p)) return;
    if (step < 3) setStep(step + 1);
    else onComplete();
  };
  return (
    <DeckShell
      deck="basics"
      step={step}
      count={4}
      title={title}
      onBack={step ? () => setStep(step - 1) : undefined}
      onNext={next}
      cta={step === 0 ? COPY.cta.start : COPY.cta.continue}
      disabled={!canContinue("basics", step, p)}
    >
      {step === 0 && (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
          }}
        >
          <View
            style={{
              width: 290,
              height: 240,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                position: "absolute",
                bottom: 18,
                width: 110,
                height: 12,
                borderRadius: 55,
                backgroundColor: colors.ink,
                opacity: 0.1,
              }}
            />
            <LoopView>
              <Image
                accessibilityLabel="Finn waves"
                source={FINN_PLUSH.loading}
                style={{ width: 200, height: 200 }}
              />
            </LoopView>
            <View
              style={{
                position: "absolute",
                top: 10,
                left: 0,
                transform: [{ rotate: "-10deg" }],
              }}
            >
              <IconTile
                color="coral"
                size={54}
                path="M4 11l8-7 8 7v9H4zM10 20v-5h4v5"
              />
            </View>
            <View
              style={{
                position: "absolute",
                top: 20,
                right: 0,
                transform: [{ rotate: "9deg" }],
              }}
            >
              <IconTile
                color="sun"
                size={48}
                path="M12 2v20M17 6H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H6"
              />
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 8,
                left: 5,
                transform: [{ rotate: "7deg" }],
              }}
            >
              <IconTile color="lilac" size={44} path="M5 21V4h11l-2 4 2 4H5" />
            </View>
            <View
              style={{
                position: "absolute",
                bottom: 15,
                right: 2,
                transform: [{ rotate: "-8deg" }],
              }}
            >
              <IconTile
                color="mint"
                size={46}
                path="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3"
              />
            </View>
          </View>
          <Text style={[layout.title, { fontSize: 30, textAlign: "center" }]}>
            {COPY.basics.introTitle}
          </Text>
          <Text style={[layout.body, { textAlign: "center" }]}>
            {COPY.basics.introBody}
          </Text>
        </View>
      )}
      {step === 1 && (
        <>
          <FinnSays>{COPY.basics.askName}</FinnSays>
          <Micro>{COPY.basics.nameLabel}</Micro>
          <TextInput
            accessibilityLabel={COPY.basics.nameLabel}
            placeholder={COPY.basics.namePlaceholder}
            placeholderTextColor={colors.placeholder}
            value={p.firstName}
            onChangeText={(firstName) => update({ firstName })}
            autoCapitalize="words"
            textContentType="givenName"
            returnKeyType="next"
            onSubmitEditing={next}
            style={{
              minHeight: 58,
              borderRadius: 16,
              backgroundColor: colors.surface,
              boxShadow: shadow.well,
              borderWidth: 1.5,
              borderColor: p.firstName.trim()
                ? colors.accent
                : neutral.inputBorder,
              paddingHorizontal: 18,
              fontFamily: fonts.semibold,
              fontSize: 22,
              color: colors.ink,
            }}
          />
          {p.firstName.trim() !== "" && (
            <FinnSays head="happy">
              Nice to meet you,{" "}
              <Text style={{ fontFamily: fonts.bold }}>
                {p.firstName.trim()}
              </Text>
              .
            </FinnSays>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <FinnSays>{COPY.basics.askStage}</FinnSays>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {LIFE_STAGES.map((stage) => (
              <OptionCard
                key={stage.id}
                grid
                label={stage.label}
                sub={stage.sub}
                selected={p.lifeStage === stage.id}
                onPress={() => update({ lifeStage: stage.id })}
                style={{ width: "48%", flexGrow: 1 }}
              >
                <IconTile path={stage.icon} color="coral" />
              </OptionCard>
            ))}
          </View>
        </>
      )}
      {step === 3 && (
        <DoneScreen
          color="coral"
          title={COPY.basics.doneTitle}
          chips={[
            p.firstName.trim() || "friend",
            LIFE_STAGES.find((s) => s.id === p.lifeStage)?.label ??
              "Life stage skipped",
          ]}
          next={COPY.basics.doneNext}
        />
      )}
    </DeckShell>
  );
}
