import { Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: accounts + upcoming bills (Slice B).
export default function MoneyScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
      <Text className="font-bold text-2xl text-ink">Money</Text>
    </SafeAreaView>
  );
}
