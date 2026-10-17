import { Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder: new-goal form → useCreateGoal → /approve/[id] (Slice B).
export default function NewGoalScreen() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-foam">
      <Text className="font-heavy text-2xl text-deep">New goal</Text>
    </SafeAreaView>
  );
}
