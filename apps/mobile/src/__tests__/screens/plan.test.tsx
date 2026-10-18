import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { analysisTasks } from '@/components/session/analysis';
import { PlanLoading } from '@/features/plan/PlanLoading';
import { usePlanBuild } from '@/features/plan/usePlanBuild';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
const mockSession = jest.fn();
jest.mock('@/auth/useSession', () => ({ useSession: () => mockSession() }));
jest.mock('@/components/session/analysis', () => ({ ANALYSIS_KEY: 'finni.analysis.v1', analysisTasks: [jest.fn(), jest.fn(), jest.fn(), jest.fn()] }));
const mockTasks = analysisTasks as jest.Mock[];
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const props = { completed: 0, error: false, canSkip: false, onRetry: jest.fn(), onSkip: jest.fn(), onDone: jest.fn() };
const renderPlan = (p: Partial<typeof props> = {}) =>
  render(<SafeAreaProvider initialMetrics={metrics}><PlanLoading {...props} {...p} /></SafeAreaProvider>);

describe('PlanLoading', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('holds each segment until its step has finished, then celebrates', async () => {
    const view = await renderPlan();
    expect(screen.getByText('Reading your basics')).toBeTruthy();
    await act(() => jest.advanceTimersByTimeAsync(10_000));
    // Still inside the first quarter: the basics step hasn't finished.
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBeLessThan(25);

    await view.rerender(<SafeAreaProvider initialMetrics={metrics}><PlanLoading {...props} completed={4} /></SafeAreaProvider>);
    await act(() => jest.advanceTimersByTimeAsync(8_000));
    expect(screen.getByText('Your plan is ready')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'See my plan' }));
    expect(props.onDone).toHaveBeenCalled();
  });

  it('shows the bank error with retry, and skip only when allowed', async () => {
    const onRetry = jest.fn(), onSkip = jest.fn();
    const view = await renderPlan({ completed: 3, error: true, onRetry });
    expect(screen.getByText("We couldn't reach your bank")).toBeTruthy();
    expect(screen.queryByText('Skip bank for now')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();

    await view.rerender(<SafeAreaProvider initialMetrics={metrics}><PlanLoading {...props} completed={3} error canSkip onSkip={onSkip} /></SafeAreaProvider>);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip bank for now' }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('says Finni is unreachable when the first step fails', async () => {
    await renderPlan({ completed: 0, error: true });
    expect(screen.getByText("We couldn't reach Finni")).toBeTruthy();
  });
});

describe('usePlanBuild', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockTasks.forEach((t) => t.mockReset().mockResolvedValue(undefined));
  });

  it('maps session phases to the first two steps', async () => {
    mockSession.mockReturnValue({ phase: 'bootstrapping', retry: jest.fn() });
    const { result, rerender } = await renderHook(() => usePlanBuild());
    expect(result.current.completed).toBe(0);
    mockSession.mockReturnValue({ phase: 'seeding', retry: jest.fn() });
    await rerender({});
    expect(result.current.completed).toBe(1);
    expect(mockTasks[0]).not.toHaveBeenCalled();
  });

  it('runs the first analysis once ready and marks it done for the tabs', async () => {
    mockSession.mockReturnValue({ phase: 'ready', retry: jest.fn() });
    const { result } = await renderHook(() => usePlanBuild());
    await waitFor(() => expect(result.current.completed).toBe(4));
    mockTasks.forEach((t) => expect(t).toHaveBeenCalledTimes(1));
    expect(await AsyncStorage.getItem('finni.analysis.v1')).toBe('true');
  });

  it('resumes from the failed task on retry and allows skipping meanwhile', async () => {
    mockSession.mockReturnValue({ phase: 'ready', retry: jest.fn() });
    mockTasks[2].mockRejectedValueOnce(new Error('down'));
    const { result } = await renderHook(() => usePlanBuild());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current).toMatchObject({ completed: 2, canSkip: true });
    expect(await AsyncStorage.getItem('finni.analysis.v1')).toBeNull();
    await act(() => result.current.retry());
    await waitFor(() => expect(result.current.completed).toBe(4));
    expect(mockTasks[0]).toHaveBeenCalledTimes(1);
    expect(mockTasks[2]).toHaveBeenCalledTimes(2);
  });

  it('retries the session when bootstrap failed', async () => {
    const retry = jest.fn();
    mockSession.mockReturnValue({ phase: 'error', retry });
    const { result } = await renderHook(() => usePlanBuild());
    expect(result.current).toMatchObject({ error: true, canSkip: false });
    await act(() => result.current.retry());
    expect(retry).toHaveBeenCalled();
  });
});
