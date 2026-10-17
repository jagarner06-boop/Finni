import { parseContribution, formatCents } from '@finni/shared';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, fonts } from '@/theme/tokens';
import { SettingsRow } from './SettingsRow';

export function SavingsBudgetSetting({ budgetCents, onSave }: { budgetCents: number | null; onSave: (cents: number | null) => Promise<unknown> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cents = draft.trim() === '' ? null : /^0(?:\.0{1,2})?$/.test(draft.trim()) ? 0 : parseContribution(draft);
  const valid = draft.trim() === '' || cents !== null;
  if (!editing) return <SettingsRow icon="target" title="Monthly savings budget" value={budgetCents === null ? 'Not set' : formatCents(budgetCents)} onPress={() => { setDraft(budgetCents === null ? '' : String(budgetCents / 100)); setEditing(true); }} />;
  return <View style={{ padding: 14, gap: 12 }}>
    <Text style={{ fontFamily: fonts.semibold, color: colors.ink }}>Monthly savings budget</Text>
    <Text style={{ fontFamily: fonts.regular, color: colors.muted }}>Across all goals. Resets on the 1st (UTC). Leave blank for no budget.</Text>
    <TextInput accessibilityLabel="Monthly savings budget in dollars" keyboardType="decimal-pad" value={draft} onChangeText={setDraft} placeholder="No budget" editable={!saving} style={{ padding: 12, backgroundColor: colors.canvas, borderRadius: 12, color: colors.ink, fontFamily: fonts.regular }} />
    {!valid && <Text accessibilityRole="alert" style={{ color: colors.dangerInk }}>Enter whole dollars, up to $1,000,000.</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.dangerInk }}>{error}</Text>}
    <Button label="Save budget" disabled={!valid} loading={saving} onPress={async () => {
      setSaving(true); setError('');
      try { await onSave(cents); setEditing(false); } catch { setError('Couldn’t save your budget. Please try again.'); }
      finally { setSaving(false); }
    }} />
    <Button variant="ghost" label="Cancel" disabled={saving} onPress={() => setEditing(false)} />
  </View>;
}
