import * as LocalAuthentication from 'expo-local-authentication';

import { clearDemoDevice, confirmWithDevice, getDemoToken } from '@/auth/demoAuth';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

const hasHardware = LocalAuthentication.hasHardwareAsync as jest.Mock;
const enrolled = LocalAuthentication.isEnrolledAsync as jest.Mock;
const authenticate = LocalAuthentication.authenticateAsync as jest.Mock;

beforeEach(() => mockStore.clear());

describe('demo device token', () => {
  it('is created once, reused, and replaced after clearing', async () => {
    const t1 = await getDemoToken();
    const t2 = await getDemoToken();
    expect(t1).toMatch(/^demo\.[A-Za-z0-9-]{8,64}$/);
    expect(t2).toBe(t1);
    await clearDemoDevice();
    expect(await getDemoToken()).not.toBe(t1);
  });
});

describe('confirmWithDevice', () => {
  it('passes when the device has no biometrics', async () => {
    hasHardware.mockResolvedValue(false);
    expect(await confirmWithDevice()).toBe(true);
  });

  it('passes when nothing is enrolled', async () => {
    hasHardware.mockResolvedValue(true);
    enrolled.mockResolvedValue(false);
    expect(await confirmWithDevice()).toBe(true);
  });

  it('fails when the user cancels', async () => {
    hasHardware.mockResolvedValue(true);
    enrolled.mockResolvedValue(true);
    authenticate.mockResolvedValue({ success: false });
    expect(await confirmWithDevice()).toBe(false);
    expect(authenticate).toHaveBeenCalledWith({ promptMessage: "Confirm it's you" });
  });

  it('passes when the user confirms', async () => {
    hasHardware.mockResolvedValue(true);
    enrolled.mockResolvedValue(true);
    authenticate.mockResolvedValue({ success: true });
    expect(await confirmWithDevice()).toBe(true);
  });
});
