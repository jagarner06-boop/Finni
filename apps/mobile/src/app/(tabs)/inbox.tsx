import { Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: nudges list (Slice B).
export default function InboxScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-foam">
      <Text className="font-heavy text-2xl text-deep">Inbox</Text>
    </SafeAreaView>
  );
}
