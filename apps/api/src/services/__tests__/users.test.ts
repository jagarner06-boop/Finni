import type { FinnProfile } from '@finni/shared';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ user: { id: 'u', firstName: 'Gabe' } as Record<string, unknown> }));
vi.mock('../../db/client.js', async () => ({
  schema: await import('../../db/schema.js'),
  db: { update: () => ({ set: (patch: object) => ({ where: () => ({ returning: async () => {
    Object.assign(state.user, patch);
    return [{ ...state.user }];
  } }) }) }) },
}));
vi.mock('../../nessie/client.js', () => ({ nessie: {} }));
vi.mock('../seed.js', () => ({ seedPersona: vi.fn() }));
import { saveProfile } from '../users.js';
const profile: FinnProfile = { lifeStage: 'student', paySchedule: 'biweekly', nextPayday: null, style: 'steady', handsOn: 'suggest' };
beforeEach(() => { state.user = { id: 'u', firstName: 'Gabe' }; });
it('replaces an existing demo name with the entered onboarding name', async () => {
  expect(await saveProfile('u', profile, '  Jordan  ')).toMatchObject({ firstName: 'Jordan', profile });
});
it('keeps the existing name when older clients send only preferences', async () => {
  expect(await saveProfile('u', profile)).toMatchObject({ firstName: 'Gabe', profile });
});
it('does not erase a name with a blank onboarding value', async () => {
  expect(await saveProfile('u', profile, '  ')).toMatchObject({ firstName: 'Gabe', profile });
});
