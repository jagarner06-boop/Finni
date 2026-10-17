import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { tokenStore } from './tokenStore';

WebBrowser.maybeCompleteAuthSession();

const DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
const CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;
const AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE!;

const ACCESS_KEY = 'finni.accessToken';
const ID_KEY = 'finni.idToken';

const MFA_ACR = 'http://schemas.openid.net/pape/policies/2007/06/multi-factor';

export interface AuthUser {
  sub: string;
  name?: string;
  givenName?: string;
  email?: string;
}

interface AuthContextValue {
  ready: boolean;
  accessToken: string | null;
  user: AuthUser | null;
  redirectUri: string;
  signIn: () => Promise<void>;
  /** Re-authenticate with MFA; resolves to the new access token (or null if cancelled). */
  stepUp: () => Promise<string | null>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const utf8 = Array.from(atob(b64), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  return JSON.parse(decodeURIComponent(utf8));
}

function userFromIdToken(idToken: string | null): AuthUser | null {
  if (!idToken) return null;
  try {
    const c = decodeJwt(idToken);
    return { sub: String(c.sub), name: c.name as string, givenName: c.given_name as string, email: c.email as string };
  } catch {
    return null;
  }
}

function isExpired(accessToken: string): boolean {
  try {
    const { exp } = decodeJwt(accessToken) as { exp?: number };
    return !exp || exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const discovery = AuthSession.useAutoDiscovery(`https://${DOMAIN}`);
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: 'finni', path: 'callback' }), []);

  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loginHint = useRef<string | undefined>(undefined);

  // Restore session on launch.
  useEffect(() => {
    (async () => {
      const [at, it] = await Promise.all([tokenStore.get(ACCESS_KEY), tokenStore.get(ID_KEY)]);
      if (at && !isExpired(at)) {
        setAccessToken(at);
        setUser(userFromIdToken(it));
      }
      setReady(true);
    })();
  }, []);

  // One authorize + PKCE code exchange; extraParams lets step-up add acr_values/prompt.
  const authorize = useCallback(
    async (extraParams: Record<string, string> = {}) => {
      if (!discovery) throw new Error('Auth0 discovery not loaded yet');
      setError(null);
      const request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        redirectUri,
        scopes: ['openid', 'profile', 'email'],
        extraParams: { audience: AUDIENCE, ...extraParams },
      });
      const result = await request.promptAsync(discovery);
      if (result.type !== 'success') {
        if (result.type === 'error') setError(result.error?.message ?? 'Login failed');
        return null;
      }
      const tokens = await AuthSession.exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          code: result.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        discovery,
      );
      await tokenStore.set(ACCESS_KEY, tokens.accessToken);
      if (tokens.idToken) await tokenStore.set(ID_KEY, tokens.idToken);
      const u = userFromIdToken(tokens.idToken ?? null);
      loginHint.current = u?.email;
      setAccessToken(tokens.accessToken);
      setUser(u);
      return tokens.accessToken;
    },
    [discovery, redirectUri],
  );

  const signIn = useCallback(async () => {
    try {
      await authorize();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [authorize]);

  const stepUp = useCallback(async () => {
    try {
      return await authorize({
        acr_values: MFA_ACR,
        prompt: 'login',
        ...(loginHint.current || user?.email ? { login_hint: (loginHint.current ?? user?.email)! } : {}),
      });
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }, [authorize, user?.email]);

  const signOut = useCallback(async () => {
    await Promise.all([tokenStore.remove(ACCESS_KEY), tokenStore.remove(ID_KEY)]);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ready: ready && !!discovery, accessToken, user, redirectUri, signIn, stepUp, signOut, error }),
    [ready, discovery, accessToken, user, redirectUri, signIn, stepUp, signOut, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
