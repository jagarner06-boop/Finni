import { loadOnboarding, saveOnboarding, initialProfile, destination } from '../state';

function memory() {
  const data = new Map<string, string>();
  return { data, getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { data.set(key, value); } };
}

it('starts new users in Basics only after authentication and hydration', () => {
  expect(destination('signedOut', true, false)).toBe('welcome');
  expect(destination('signedIn', false, false)).toBe(null);
  expect(destination('signedIn', true, false)).toBe('onboarding');
  expect(destination('signedIn', true, true)).toBe('tabs');
});

it('persists the profile before marking onboarding complete', async () => {
  const store = memory();
  await saveOnboarding(store, { ...initialProfile(), firstName: '  Alex  ' });
  const restored = await loadOnboarding(store);
  expect(restored.complete).toBe(true);
  expect(restored.profile.firstName).toBe('Alex');
  expect(store.data.get('finni.onboarding.complete')).toBe('true');
});

it('does not mark complete when saving the profile fails', async () => {
  const store = memory();
  store.setItem = async () => { throw new Error('disk full'); };
  await expect(saveOnboarding(store, initialProfile())).rejects.toThrow('disk full');
  expect(store.data.has('finni.onboarding.complete')).toBe(false);
});

it('restarts safely after corrupted or missing saved profile', async () => {
  const store = memory();
  store.data.set('finni.onboarding.complete', 'true');
  store.data.set('finni.onboarding.v1', '{broken');
  expect((await loadOnboarding(store)).complete).toBe(false);
  store.data.set('finni.onboarding.v1', '{}');
  expect((await loadOnboarding(store)).complete).toBe(false);
});
