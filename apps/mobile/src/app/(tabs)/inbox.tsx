import { Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: nudges list (Slice B).
export default function InboxScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
      <Text className="font-bold text-2xl text-ink">Inbox</Text>
    </SafeAreaView>
  );
}
