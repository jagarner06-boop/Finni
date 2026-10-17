import { authBridge } from '@/auth/authBridge';
import { ApiError, apiFetch } from '@/api/client';

const stepUp = jest.fn();
const forbidden = () =>
  ({ ok: false, status: 403, json: () => Promise.resolve({ error: 'step_up_required' }) }) as unknown as Response;

beforeEach(() => {
  stepUp.mockReset();
  authBridge.register({
    getAccessToken: async () => 'tok',
    getIdToken: async () => null,
    stepUp,
    onUnauthorized: () => {},
  });
  globalThis.fetch = jest.fn(() => Promise.resolve(forbidden())) as jest.Mock;
});

describe('apiFetch step-up', () => {
  it("leaves a step-up to the caller with stepUp: 'none'", async () => {
    const err = await apiFetch('/actions/a/approve', { method: 'POST', stepUp: 'none' }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).isStepUpRequired).toBe(true);
    expect(stepUp).not.toHaveBeenCalled();
  });

  it('steps up by itself by default', async () => {
    stepUp.mockResolvedValue(null);
    await apiFetch('/x').catch(() => {});
    expect(stepUp).toHaveBeenCalledTimes(1);
  });
});
