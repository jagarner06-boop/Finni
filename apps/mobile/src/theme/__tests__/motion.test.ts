import type { SharedValue } from 'react-native-reanimated';

import { hop, holdSquash, startRock } from '@/theme/motion';

// A shared value stand-in that counts writes, so we can tell "skipped" from "animated back to rest".
function recorder(initial: number) {
  let v = initial;
  const sv = { writes: 0, get value() { return v; }, set value(next: number) { sv.writes++; v = next; } };
  return sv as typeof sv & SharedValue<number>;
}
const finn = () => ({ y: recorder(0), sx: recorder(1), sy: recorder(1), rot: recorder(0) });
const writes = (sv: ReturnType<typeof finn>) => sv.y.writes + sv.sx.writes + sv.sy.writes + sv.rot.writes;

describe.each([
  ['hop', hop],
  ['startRock', startRock],
  ['holdSquash', holdSquash],
])('%s', (_name, preset) => {
  it('does nothing under Reduce Motion', () => {
    const sv = finn();
    preset(sv, true);
    expect(writes(sv)).toBe(0);
  });

  it('animates Finn otherwise', () => {
    const sv = finn();
    preset(sv, false);
    expect(writes(sv)).toBeGreaterThan(0);
  });
});
