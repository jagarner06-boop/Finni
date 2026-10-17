import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { showToast } from './toast';

// Local notifications only (remote push needs a dev build). On web → toast.

if (Platform.OS !== 'web') {
  // Show banners even while the app is in the foreground.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/** Fire a notification immediately. Never throws. */
export async function notifyLocal(title: string, body: string, data?: Record<string, unknown>) {
  if (Platform.OS === 'web') {
    showToast(title, body);
    return;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null,
    });
  } catch {
    showToast(title, body);
  }
}
