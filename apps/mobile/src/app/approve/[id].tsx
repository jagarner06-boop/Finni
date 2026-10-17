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
    <SafeAreaView className="flex-1 items-center justify-center bg-foam">
      <Text className="font-heavy text-2xl text-deep">Approve</Text>
      <Text className="font-body text-muted">{data?.action.title ?? id}</Text>
    </SafeAreaView>
  );
}
