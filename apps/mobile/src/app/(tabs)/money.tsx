import { Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: accounts + upcoming bills (Slice B).
export default function MoneyScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-foam">
      <Text className="font-heavy text-2xl text-deep">Money</Text>
    </SafeAreaView>
  );
}
