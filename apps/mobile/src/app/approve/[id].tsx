import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { useAction } from '@/api/queries';
import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: approval sheet (Slice B). Approve via useApproveAction(); step-up
// on 403 is automatic inside apiFetch.
export default function ApproveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useAction(id);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
      <Text className="font-bold text-2xl text-ink">Approve</Text>
      <Text className="font-regular text-muted">{data?.action.title ?? id}</Text>
    </SafeAreaView>
  );
}
