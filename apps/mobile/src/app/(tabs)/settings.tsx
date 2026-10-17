import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCents } from '@finni/shared';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useClearChat, useResetDemo, useSettings, useUpdateSettings } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { SettingsGroup, SettingsRow } from '@/components/settings/SettingsRow';
import { SavingsBudgetSetting } from '@/components/settings/SavingsBudgetSetting';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { saveOnboarding } from '@/features/onboarding/state';
import { colors, fonts } from '@/theme/tokens';

/** Native confirm with a destructive action button. */
function confirm(title: string, message: string, action: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}

// Settings: profile, Finn's check-ins, accounts, security, and demo data.
export default function SettingsScreen() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const reset = useResetDemo();
  const clearChat = useClearChat();
  const { logout } = useAuth();
  const { profile, update: updateOnboarding } = useOnboarding();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const data = settings.data;
  const saveName = async () => {
    const firstName = name.trim();
    setEditing(false);
    if (!firstName || firstName === data?.firstName) return;
    try {
      await update.mutateAsync({ firstName });
      await saveOnboarding(AsyncStorage, { ...profile, firstName });
      updateOnboarding({ firstName });
    } catch {
      Alert.alert('Could not finish saving your name', 'Please try again.');
    }
  };

  if (!data) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            Settings
          </Text>
          {settings.isError && (
            <View style={styles.error}>
              <Text style={styles.muted}>Couldn&apos;t load your settings.</Text>
              <Button label="Try again" size="sm" variant="secondary" onPress={() => settings.refetch()} />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Short enough to sit on one line beside the label: "Face ID over $100" / "Sign-in over $100".
  const approvals = `${data.authMode === 'demo' ? 'Face ID' : 'Sign-in'} over ${formatCents(data.stepUpThresholdCents).replace(/\.00$/, '')}`;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          Settings
        </Text>

        <SettingsGroup title="PROFILE">
          {editing ? (
            <SettingsRow icon="user" title="Name">
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                onSubmitEditing={saveName}
                onBlur={saveName}
                accessibilityLabel="Your name"
                autoFocus
                returnKeyType="done"
                maxLength={40}
              />
            </SettingsRow>
          ) : (
            <SettingsRow
              icon="user"
              title="Name"
              value={data.firstName ?? 'Add your name'}
              onPress={() => {
                setName(data.firstName ?? '');
                setEditing(true);
              }}
            />
          )}
          {data.email ? <SettingsRow icon="mail" title="Email" value={data.email} /> : null}
        </SettingsGroup>

        <SettingsGroup title="FINN">
          <SavingsBudgetSetting budgetCents={data.prefs.monthlySavingsBudgetCents ?? null} onSave={(monthlySavingsBudgetCents) => update.mutateAsync({ prefs: { monthlySavingsBudgetCents } })} />
          <SettingsRow
            icon="bell"
            title="Finn check-ins"
            toggle={{ value: data.prefs.notifications, onChange: (v) => update.mutate({ prefs: { notifications: v } }) }}
          />
          <SettingsRow
            icon="eye-off"
            title="Hide balances on Home"
            toggle={{ value: data.prefs.hideBalance, onChange: (v) => update.mutate({ prefs: { hideBalance: v } }) }}
          />
        </SettingsGroup>

        <SettingsGroup title="ACCOUNTS">
          {data.accounts
            .filter((a) => !a.isGoal)
            .map((a) => (
              <SettingsRow
                key={a.id}
                icon={a.type === 'Credit Card' ? 'credit-card' : 'briefcase'}
                title={a.nickname}
                value={`•••• ${a.mask}`}
                onPress={() => router.push(`/activity?segment=transactions&accountId=${a.id}`)}
              />
            ))}
        </SettingsGroup>

        <SettingsGroup title="SECURITY">
          <SettingsRow icon="shield" title="Approvals" value={approvals} />
        </SettingsGroup>

        <SettingsGroup title="DATA">
          <SettingsRow
            icon="message-circle"
            title="Clear chat with Finn"
            onPress={() => confirm('Clear chat with Finn?', 'Your messages with Finn will be deleted.', 'Clear', () => clearChat.mutate())}
          />
          <SettingsRow
            icon="refresh-cw"
            title="Reset demo data"
            onPress={() =>
              confirm('Reset demo data?', 'Finn sets up fresh accounts, bills, and goals. This takes a few seconds.', 'Reset', () =>
                reset.mutate(),
              )
            }
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon="log-out" title="Sign out" destructive onPress={() => confirm('Sign out?', '', 'Sign out', () => void logout())} />
        </SettingsGroup>

        <Text style={styles.version}>Finni {Constants.expoConfig?.version ?? ''}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink, paddingTop: 8 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, paddingVertical: 8 },
  muted: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  error: { gap: 12, alignItems: 'flex-start' },
  version: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
