import { renderHook } from '@testing-library/react-native';
import { useSession } from '../useSession';
import { initialProfile } from '@/features/onboarding/state';

const mockMutate = jest.fn();
const mockBootstrap = { mutate: mockMutate, isSuccess: true, isError: false, error: null };
const mockProfile = { ...initialProfile(), firstName: '  Jordan  ' };
jest.mock('@/api/queries', () => ({
  useBootstrap: () => mockBootstrap,
  useMe: () => ({ data: { seeded: true }, isError: false, refetch: jest.fn() }),
}));
jest.mock('../AuthProvider', () => ({ useAuth: () => ({ status: 'signedIn' }) }));
jest.mock('@/features/onboarding/OnboardingProvider', () => ({ useOnboarding: () => ({ complete: true, profile: mockProfile }) }));

beforeEach(() => { jest.clearAllMocks(); mockBootstrap.isError = false; });
it('sends the entered onboarding name with the profile', async () => {
  await renderHook(() => useSession());
  expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Jordan', profile: expect.objectContaining({ paySchedule: 'biweekly' }) }));
});
it('keeps the onboarding name when retrying bootstrap', async () => {
  mockBootstrap.isError = true;
  const { result } = await renderHook(() => useSession());
  result.current.retry();
  expect(mockMutate).toHaveBeenLastCalledWith(expect.objectContaining({ firstName: 'Jordan' }));
});
