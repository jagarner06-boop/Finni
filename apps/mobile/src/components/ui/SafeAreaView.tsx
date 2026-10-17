import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

/** SafeAreaView that accepts `className` (Uniwind only patches RN core components). */
export const SafeAreaView = withUniwind(RNSafeAreaView);
