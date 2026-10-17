import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { FinnSays } from "@/components/finn/FinnSays";
import { Chip } from "@/components/ui/Chip";
import { OptionCard } from "@/components/ui/OptionCard";
import { haptics } from "@/lib/haptics";
import { palette, onboardingVisual } from "@/theme/palette";
import { colors, fonts } from "@/theme/tokens";
import { DeckShell } from "./DeckShell";
import { DoneScreen } from "./DoneScreen";
import { useOnboarding } from "./OnboardingProvider";
import { BILLS, COPY, INCOME_PRESETS, PAY_SCHEDULES } from "./content";
import { canContinue, dollars, incomePatch, paydayLabels } from "./logic";
import { billsMaximum } from "./state";
import { Card, layout, Micro } from "./presentation";

export default function IncomeDeck({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { profile: p, update } = useOnboarding();
  const titles = [
    COPY.income.askIncome(p.firstName.trim()),
    COPY.income.askPay,
    COPY.income.askBills,
    COPY.income.doneTitle,
  ];
  const free = Math.max(0, p.monthlyIncome - p.monthlyBills);
  return (
    <DeckShell
      deck="income"
      step={step}
      count={4}
      title={titles[step]}
      onBack={step ? () => setStep(step - 1) : undefined}
      onNext={() => {
        if (!canContinue("income", step, p)) return;
        if (step < 3) setStep(step + 1);
        else onComplete();
      }}
      disabled={!canContinue("income", step, p)}
    >
      {step === 0 && (
        <>
          <FinnSays>{titles[0]}</FinnSays>
          <Card style={{ paddingTop: 22, alignItems: "center" }}>
            <Micro>{COPY.income.incomeLabel}</Micro>
            <Text style={[layout.amount, { fontSize: 44 }]}>
              {dollars(p.monthlyIncome)}
            </Text>
            <AmountSlider
              label="Take-home per month"
              value={p.monthlyIncome}
              min={500}
              max={12000}
              step={50}
              onChange={(value) => update(incomePatch(p, value))}
            />
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {COPY.income.incomeRange.map((t) => (
                <Text
                  key={t}
                  style={{ fontSize: 12, color: colors.placeholder }}
                >
                  {t}
                </Text>
              ))}
            </View>
          </Card>
          <View style={[layout.wrap, { justifyContent: "center" }]}>
            {INCOME_PRESETS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Set income to ${value} dollars`}
                onPress={() => {
                  haptics.selection();
                  update(incomePatch(p, value));
                }}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <View
                  style={{
                    minHeight: 36,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    justifyContent: "center",
                    backgroundColor: palette.sun.tint,
                    experimental_backgroundImage:
                      onboardingVisual.presetGradient,
                    borderBottomWidth: 1,
                    borderColor: palette.sun.lip,
                  }}
                >
                  <Text
                    style={{
                      color: palette.sun.ink,
                      fontFamily: fonts.bold,
                      fontSize: 14,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {dollars(value)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={layout.note}>{COPY.income.incomeNote}</Text>
        </>
      )}
      {step === 1 && (
        <>
          <FinnSays>{titles[1]}</FinnSays>
          <View style={{ gap: 10 }}>
            {PAY_SCHEDULES.map((schedule) => (
              <OptionCard
                inline
                key={schedule.id}
                label={schedule.label}
                sub={schedule.sub}
                selected={p.paySchedule === schedule.id}
                onPress={() =>
                  update({ paySchedule: schedule.id, nextPayday: 0 })
                }
              />
            ))}
          </View>
          <Micro>{COPY.income.paydayLabel}</Micro>
          <View style={layout.wrap}>
            {paydayLabels(p.paySchedule).map((label, i) => (
              <Chip
                key={label}
                label={label}
                selected={p.nextPayday === i}
                onPress={() => update({ nextPayday: i as 0 | 1 | 2 })}
              />
            ))}
          </View>
        </>
      )}
      {step === 2 && (
        <>
          <FinnSays>{titles[2]}</FinnSays>
          <View style={layout.wrap}>
            {BILLS.map((label) => (
              <Chip
                key={label}
                label={label}
                multiple
                color="sun"
                selected={p.bills.includes(label)}
                onPress={() =>
                  update({
                    bills: p.bills.includes(label)
                      ? p.bills.filter((b) => b !== label)
                      : [...p.bills, label],
                  })
                }
              />
            ))}
          </View>
          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Micro>{COPY.income.billsLabel}</Micro>
              </View>
              <Text style={[layout.amount, { fontSize: 22 }]}>
                {dollars(p.monthlyBills)}
              </Text>
            </View>
            <AmountSlider
              label="Monthly bills"
              min={0}
              max={billsMaximum(p.monthlyIncome)}
              step={25}
              value={p.monthlyBills}
              onChange={(monthlyBills) => update({ monthlyBills })}
            />
            <View
              style={{
                height: 10,
                borderRadius: 5,
                overflow: "hidden",
                backgroundColor: colors.secondaryLip,
              }}
            >
              <View
                style={{
                  height: 10,
                  width: `${Math.min(100, (p.monthlyBills / p.monthlyIncome) * 100)}%`,
                  backgroundColor: palette.sun.base,
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {COPY.income.legend.map((label, i) => (
                <View
                  key={label}
                  style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i
                        ? colors.secondaryLip
                        : palette.sun.base,
                    }}
                  />
                  <Text style={layout.note}>{label}</Text>
                </View>
              ))}
            </View>
          </Card>
          <FinnSays small head="happy">
            That leaves about{" "}
            <Text
              style={{ fontFamily: fonts.bold, color: colors.accentPressed }}
            >
              {dollars(free)}
            </Text>{" "}
            a month for everything else.
          </FinnSays>
        </>
      )}
      {step === 3 && (
        <DoneScreen
          color="sun"
          title={COPY.income.doneTitle}
          chips={[
            `${dollars(p.monthlyIncome)}/mo`,
            `Paid ${PAY_SCHEDULES.find((s) => s.id === p.paySchedule)?.short}`,
            `${dollars(free)} free`,
          ]}
          next={COPY.income.doneNext}
        />
      )}
    </DeckShell>
  );
}
function AmountSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <Slider
      accessibilityLabel={label}
      accessibilityValue={{
        min,
        max,
        now: value,
        text: `${value.toLocaleString("en-US")} dollars`,
      }}
      style={{ width: "100%", height: 44 }}
      value={value}
      minimumValue={min}
      maximumValue={max}
      step={step}
      minimumTrackTintColor={colors.accent}
      maximumTrackTintColor={colors.warmTrack}
      thumbTintColor={colors.accent}
      onValueChange={onChange}
    />
  );
}
