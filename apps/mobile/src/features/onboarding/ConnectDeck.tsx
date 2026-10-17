import { Delayed, Skeleton } from "@/components/feedback/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as Notifications from "expo-notifications";
import { FinnSays } from "@/components/finn/FinnSays";
import { FinnSphere } from "@/components/finn/FinnSphere";
import { TickBurst } from "@/components/finn/TickBurst";
import { FINN_PLUSH } from "@/components/finn/assets";
import { Chip } from "@/components/ui/Chip";
import { Toggle } from "@/components/ui/Toggle";
import { LoopView, MotionView } from "@/components/ui/MotionView";
import { useConfetti } from "@/components/confetti/ConfettiOverlay";
import { haptics } from "@/lib/haptics";
import { confettiColors, palette } from "@/theme/palette";
import { colors, fonts, shadow } from "@/theme/tokens";
import { DeckShell } from "./DeckShell";
import { SummaryChip } from "./DoneScreen";
import { useOnboarding } from "./OnboardingProvider";
import {
  BANKS,
  COPY,
  HANDS_ON,
  LIFE_STAGES,
  NOTIFICATIONS,
  PAY_SCHEDULES,
  PLAID_FOOTNOTE,
  QUIET_HOURS,
  TRUST_ROWS,
} from "./content";
import { dollars, personalityFor } from "./logic";
import { Card, IconTile, layout, Micro } from "./presentation";
import { linkBank } from "./linkBank";
import { requestChosenNotifications } from "./permissions";

type Phase = "intro" | "pick" | "linking" | "linked";
export default function ConnectDeck({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { profile: p, update, finish, saving, error } = useOnboarding();
  const [step, setStep] = useState(0),
    [phase, setPhase] = useState<Phase>("intro");
  const [query, setQuery] = useState(""),
    [institution, setInstitution] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null),
    [prompting, setPrompting] = useState(false);
  const operation = useRef<AbortController | null>(null),
    permissionPending = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      operation.current?.abort();
    };
  }, []);
  const selectBank = async (bank: string) => {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setInstitution(bank);
    setPhase("linking");
    setLinkError(null);
    haptics.selection();
    try {
      await linkBank(bank, controller.signal);
      if (controller.signal.aborted || !alive.current) return;
      update({ bank: { institution: bank, linked: true } });
      setPhase("linked");
    } catch {
      if (controller.signal.aborted || !alive.current) return;
      setLinkError("Could not connect. Please try again.");
      setPhase("pick");
    }
  };
  const back = () => {
    operation.current?.abort();
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    if (phase === "linked" || phase === "linking") {
      update({ bank: null });
      setPhase("pick");
    } else setPhase("intro");
  };
  const next = async () => {
    if (step === 0) {
      if (phase === "intro") setPhase("pick");
      else if (phase === "linked") setStep(1);
      return;
    }
    if (step === 1) {
      if (permissionPending.current) return;
      permissionPending.current = true;
      setPrompting(true);
      await requestChosenNotifications(p.notifications, () =>
        Notifications.requestPermissionsAsync(),
      );
      permissionPending.current = false;
      if (alive.current) {
        setPrompting(false);
        setStep(2);
      }
      return;
    }
    if (await finish()) onComplete();
  };
  const title =
    step === 1
      ? COPY.connect.askNotifs
      : step === 2
        ? COPY.connect.finishTitle(p.firstName.trim() || "friend")
        : phase === "intro"
          ? COPY.connect.askBank
          : phase === "pick"
            ? COPY.connect.pickTitle
            : phase === "linking"
              ? COPY.connect.linking(institution)
              : COPY.connect.linkedTitle(institution);
  const cta =
    step === 2
      ? COPY.cta.goHome
      : step === 1
        ? COPY.cta.finishSetup
        : phase === "intro"
          ? COPY.cta.connect
          : phase === "pick"
            ? COPY.cta.chooseBank
            : phase === "linking"
              ? COPY.cta.connecting
              : COPY.cta.continue;
  return (
    <DeckShell
      deck="connect"
      step={step}
      count={3}
      title={title}
      transitionKey={`${step}-${phase}`}
      onBack={
        (step || phase !== "intro") && !prompting && !saving ? back : undefined
      }
      onNext={() => void next()}
      cta={cta}
      disabled={step === 0 && (phase === "pick" || phase === "linking")}
      loading={prompting || saving}
    >
      {step === 0 && phase === "intro" && (
        <>
          <FinnSays head="happy">{COPY.connect.askBank}</FinnSays>
          <Card>
            {TRUST_ROWS.map((row, i) => (
              <View
                key={row.title}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  paddingTop: i ? 14 : 0,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: colors.hairline,
                }}
              >
                <IconTile color="mint" path={row.icon} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 15,
                      color: colors.ink,
                    }}
                  >
                    {row.title}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.regular,
                      fontSize: 13,
                      lineHeight: 18,
                      color: colors.muted,
                    }}
                  >
                    {row.sub}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
          <Text style={[layout.note, { fontSize: 12, textAlign: "center" }]}>
            {PLAID_FOOTNOTE}
          </Text>
        </>
      )}
      {step === 0 && phase === "pick" && (
        <>
          <Text style={layout.title}>{COPY.connect.pickTitle}</Text>
          <TextInput
            accessibilityLabel="Search banks"
            value={query}
            onChangeText={setQuery}
            placeholder={COPY.connect.searchPlaceholder}
            placeholderTextColor={colors.placeholder}
            style={{
              minHeight: 48,
              borderRadius: 14,
              paddingHorizontal: 16,
              backgroundColor: colors.surface,
              boxShadow: shadow.well,
              color: colors.ink,
              fontFamily: fonts.regular,
              fontSize: 15,
            }}
          />
          {BANKS.filter((bank) =>
            bank.name.toLowerCase().includes(query.trim().toLowerCase()),
          ).map((bank) => (
            <Pressable
              key={bank.name}
              accessibilityRole="button"
              accessibilityLabel={bank.name}
              onPress={() => void selectBank(bank.name)}
              style={{
                minHeight: 58,
                padding: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.secondaryBorder,
                backgroundColor: colors.surface,
                boxShadow: shadow.secondary,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: colors.warmTrack,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.bold,
                    fontSize: 15,
                    color: colors.ink,
                  }}
                >
                  {bank.mono}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.bold,
                  fontSize: 15,
                  color: colors.ink,
                }}
              >
                {bank.name}
              </Text>
              <Text style={{ fontSize: 24, color: colors.muted }}>›</Text>
            </Pressable>
          ))}
          {!BANKS.some((b) =>
            b.name.toLowerCase().includes(query.trim().toLowerCase()),
          ) && (
            <EmptyState
              pose="laptop"
              color="mint"
              title={`No matches for "${query}".`}
              sub="Try a bank name."
              cta="Clear search"
              onPress={() => setQuery("")}
            />
          )}
          {linkError && (
            <Text accessibilityRole="alert" style={layout.note}>
              {linkError}
            </Text>
          )}
        </>
      )}
      {step === 0 && phase === "linking" && (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 22,
          }}
        >
          <FinnSphere size={88} head="curious" />
          <Text style={[layout.title, { fontSize: 18, textAlign: "center" }]}>
            {COPY.connect.linking(institution)}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[1, 0.7, 0.45].map((opacity, i) => (
              <LoopView key={i} kind="dot" delay={150 * i}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette.mint.base,
                    opacity,
                  }}
                />
              </LoopView>
            ))}
          </View>
          <View style={{ width: "100%", gap: 12 }}>
            <Delayed>
              <Skeleton />
              <Skeleton />
            </Delayed>
          </View>
        </View>
      )}
      {step === 0 && phase === "linked" && <Linked bank={institution} />}
      {step === 1 && (
        <>
          <FinnSays>{COPY.connect.askNotifs}</FinnSays>
          <Card>
            {NOTIFICATIONS.map((notification, i) => (
              <View
                key={notification.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderTopWidth: i ? 1 : 0,
                  paddingTop: i ? 14 : 0,
                  borderColor: colors.hairline,
                }}
              >
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{
                    checked: p.notifications[notification.id],
                  }}
                  accessibilityLabel={notification.title}
                  onPress={() => {
                    haptics.selection();
                    update({
                      notifications: {
                        ...p.notifications,
                        [notification.id]: !p.notifications[notification.id],
                      },
                    });
                  }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <IconTile path={notification.icon} size={38} color="mint" />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        fontFamily: fonts.bold,
                        fontSize: 15,
                        color: colors.ink,
                      }}
                    >
                      {notification.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: fonts.regular,
                        fontSize: 12,
                        color: colors.muted,
                      }}
                    >
                      {notification.sub}
                    </Text>
                  </View>
                </Pressable>
                <Toggle
                  label={`${notification.title} toggle`}
                  value={p.notifications[notification.id]}
                  onValueChange={(value) =>
                    update({
                      notifications: {
                        ...p.notifications,
                        [notification.id]: value,
                      },
                    })
                  }
                />
              </View>
            ))}
          </Card>
          <Micro>{COPY.connect.quietLabel}</Micro>
          <View style={layout.wrap}>
            {QUIET_HOURS.map((label, i) => (
              <Chip
                key={label}
                label={label}
                selected={p.quietHours === i}
                onPress={() => update({ quietHours: i as 0 | 1 | 2 })}
              />
            ))}
          </View>
        </>
      )}
      {step === 2 && <Finish />}
      {error && (
        <Text
          accessibilityRole="alert"
          style={{
            color: colors.dangerInk,
            fontFamily: fonts.regular,
            fontSize: 14,
          }}
        >
          {error}
        </Text>
      )}
    </DeckShell>
  );
}

function Linked({ bank }: { bank: string }) {
  const burst = useConfetti();
  useEffect(() => {
    burst({ colors: confettiColors(palette.mint.base) });
    haptics.success();
  }, [burst]);
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
      }}
    >
      <MotionView effect="hop" delay={100}>
        <FinnSphere size={88} head="excited" ring="mint" />
        <View style={{ position: "absolute", right: -30, top: -10 }}>
          <TickBurst color="mint" />
        </View>
      </MotionView>
      <Text style={[layout.title, { textAlign: "center" }]}>
        {COPY.connect.linkedTitle(bank)}
      </Text>
      <Text style={[layout.note, { textAlign: "center" }]}>
        {COPY.connect.linkedSub}
      </Text>
      <Card style={{ width: "100%" }}>
        {[
          { name: "Checking", digits: "1203", dollars: "$2,410", cents: ".55" },
          {
            name: "Closer Card",
            digits: "4821",
            dollars: "$1,364",
            cents: ".20",
          },
        ].map((account) => (
          <View
            key={account.name}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <IconTile color="mint" path="M3 6h18v13H3zM3 10h18M6 15h3" />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.ink,
                  fontFamily: fonts.bold,
                  fontSize: 15,
                }}
              >
                {account.name}
              </Text>
              <Text style={layout.note}>•••• {account.digits}</Text>
            </View>
            <Text style={[layout.amount, { fontSize: 16 }]}>
              {account.dollars}
              <Text style={{ fontFamily: fonts.regular, color: colors.muted }}>
                {account.cents}
              </Text>
            </Text>
          </View>
        ))}
      </Card>
    </View>
  );
}
function Finish() {
  const { profile: p } = useOnboarding();
  const burst = useConfetti();
  useEffect(() => {
    burst({
      big: true,
      originY: 0.3,
      colors: confettiColors(palette.mint.base),
    });
    haptics.success();
  }, [burst]);
  const chips = [
    LIFE_STAGES.find((s) => s.id === p.lifeStage)?.label ??
      "Life stage skipped",
    `${dollars(p.monthlyIncome)}/mo`,
    `Paid ${PAY_SCHEDULES.find((s) => s.id === p.paySchedule)?.short}`,
    personalityFor(p.habits).name,
    HANDS_ON.find((o) => o.id === p.handsOn)!.label,
    `${p.bank?.institution} linked`,
  ];
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <MotionView effect="hop" delay={100}>
        <LoopView delay={1000}>
          <Image
            accessibilityLabel="Finn celebrates"
            source={FINN_PLUSH.complete}
            style={{ width: 210, height: 210 }}
          />
        </LoopView>
      </MotionView>
      <Text style={[layout.title, { fontSize: 28, textAlign: "center" }]}>
        {COPY.connect.finishTitle(p.firstName.trim() || "friend")}
      </Text>
      <Text style={[layout.note, { fontSize: 15, textAlign: "center" }]}>
        {COPY.connect.finishSub}
      </Text>
      <View style={[layout.wrap, { justifyContent: "center" }]}>
        {chips.map((text, i) => (
          <MotionView key={text} delay={350 + i * 80}>
            <SummaryChip text={text} color="mint" />
          </MotionView>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          burst({
            big: true,
            originY: 0.3,
            colors: confettiColors(palette.mint.base),
          })
        }
        style={{
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            color: colors.accent,
            fontFamily: fonts.semibold,
            fontSize: 14,
          }}
        >
          {COPY.connect.replay}
        </Text>
      </Pressable>
    </View>
  );
}
