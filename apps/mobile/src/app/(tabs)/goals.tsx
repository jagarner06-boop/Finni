import { Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: goal cards + new goal (Slice B).
export default function GoalsScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-foam">
      <Text className="font-heavy text-2xl text-deep">Goals</Text>
    </SafeAreaView>
  );
}
