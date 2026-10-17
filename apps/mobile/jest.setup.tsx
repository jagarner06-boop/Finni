// Global Jest setup: Reanimated test mode and silent haptics.
require('react-native-reanimated').setUpTests();

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Rive is native-only; tests drive it through these spies (global.__rive).
const rive = {
  setEnum: jest.fn(),
  setBoolean: jest.fn(),
  trigger: jest.fn(),
  file: jest.fn(() => ({ riveFile: {}, isLoading: false, error: null })),
};
(globalThis as Record<string, unknown>).__rive = rive;
jest.mock('@rive-app/react-native', () => {
  const { View } = require('react-native');
  const r = (globalThis as Record<string, any>).__rive;
  return {
    __esModule: true,
    RiveView: (props: object) => <View testID="rive-view" {...props} />,
    Fit: { Contain: 1 },
    useRiveFile: (...args: unknown[]) => r.file(...args),
    useViewModelInstance: () => ({ instance: {}, isLoading: false, error: null }),
    useRiveEnum: (path: string) => ({ value: undefined, error: null, setValue: (v: string) => r.setEnum(path, v) }),
    useRiveBoolean: (path: string) => ({ value: undefined, error: null, setValue: (v: boolean) => r.setBoolean(path, v) }),
    useRiveTrigger: (path: string) => ({ error: null, trigger: () => r.trigger(path) }),
  };
});
