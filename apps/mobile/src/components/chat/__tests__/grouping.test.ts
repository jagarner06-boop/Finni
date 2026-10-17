import type { ChatMessage } from '@finni/shared';

import { groupPositions } from '@/components/chat/grouping';

const roles = (...r: ChatMessage['role'][]) => r.map((role) => ({ role }));

describe('groupPositions', () => {
  it('groups consecutive bubbles from the same speaker', () => {
    expect(groupPositions(roles('finn', 'finn', 'finn', 'user', 'finn'))).toEqual(['first', 'middle', 'last', 'solo', 'solo']);
  });

  it('treats a pair as first and last', () => {
    expect(groupPositions(roles('user', 'user'))).toEqual(['first', 'last']);
  });

  it('returns nothing for no messages', () => {
    expect(groupPositions([])).toEqual([]);
  });
});
