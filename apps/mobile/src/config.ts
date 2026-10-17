import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;

/**
 * Dev default: talk to the API on the same machine that serves Metro. On a phone
 * (Expo Go) that's the laptop's LAN IP, taken from the Metro host URI.
 */
function defaultApiUrl(): string {
  if (Platform.OS === 'web') return `http://localhost:${API_PORT}`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

export const config = {
  authMode: (process.env.EXPO_PUBLIC_AUTH_MODE === 'auth0' ? 'auth0' : 'demo') as 'demo' | 'auth0',
  demoName: process.env.EXPO_PUBLIC_DEMO_NAME || undefined,
  apiUrl: (process.env.EXPO_PUBLIC_API_URL || defaultApiUrl()).replace(/\/$/, ''),
  auth0: {
    domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'dev-qfcvf4rkm3dp8xsh.us.auth0.com',
    clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'qQweRCxviMmTL4nsKygCt8Try2jLvQJL',
    audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || 'https://api.finni.app',
  },
} as const;
