import * as Location from 'expo-location';
import type { LatLng } from '@finni/shared';
import { Platform } from 'react-native';

// Web and "denied" both return null; the backend then falls back to demo coords.

/** Ask for permission. Call after a friendly in-app pre-prompt, not on launch. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function hasLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/** Fast, non-prompting location for attaching to /chat. Never throws. */
export async function getLocation(): Promise<LatLng | null> {
  try {
    if (!(await hasLocationPermission())) return null;
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
