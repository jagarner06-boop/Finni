import { useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

const LOGOS: Record<string, ImageSourcePropType> = {
  'Capital One': require('../../../assets/banks/capital-one.png'),
  Chase: require('../../../assets/banks/chase.jpg'),
  'Bank of America': require('../../../assets/banks/bank-of-america.png'),
  'Wells Fargo': require('../../../assets/banks/wells-fargo.png'),
};

/** Bundled official institution marks; generic credit unions retain a named fallback. */
export function BankLogo({ bank }: { bank: string }) {
  const [failedBank, setFailedBank] = useState<string | null>(null);
  const source = LOGOS[bank];
  return <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
    {source && failedBank !== bank ? <Image accessibilityLabel={`${bank} logo`} accessibilityRole="image" source={source} resizeMode="contain" style={{ width: 34, height: 34 }} onError={() => setFailedBank(bank)} />
      : <View accessible accessibilityRole="image" accessibilityLabel={bank}><Feather name="briefcase" size={22} color={colors.accent} /></View>}
  </View>;
}
