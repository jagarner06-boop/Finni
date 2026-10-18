import {
  AuthRequest,
  Prompt,
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  useAutoDiscovery,
  type DiscoveryDocument,
  type TokenResponse,
} from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { jwtDecode } from 'jwt-decode';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { config } from '@/config';
import { api } from '@/api/endpoints';
import { authBridge } from './authBridge';
import { clearDemoDevice, confirmWithDevice, getDemoToken, hasDemoDevice } from './demoAuth';
import { tokenStore, type StoredTokens } from './tokenStore';

// Closes the Auth0 popup on web and hands the result back to the opener.
WebBrowser.maybeCompleteAuthSession();

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  givenName?: string;
  picture?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** False until Auth0 discovery has loaded; disable the sign-in button until then. */
  ready: boolean;
  /** `connection` skips Auth0's picker (e.g. google-oauth2); `loginHint` prefills the email. */
  login: (opts?: { forcePrompt?: boolean; connection?: string; loginHint?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  /** MFA re-auth for large approvals; resolves to the new access token or null. */
  stepUp: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SCOPES = ['openid', 'profile', 'email', 'offline_access'];
const EXPIRY_SKEW_S = 60;

// Must match an Allowed Callback URL in Auth0: exp://<LAN-IP>:8081/--/callback (Expo Go),
// finni://callback (dev build), http://localhost:8081/callback (web).
export const redirectUri = makeRedirectUri({ scheme: 'finni', path: 'callback' });

function userFromIdToken(idToken?: string): AuthUser | null {
  if (!idToken) return null;
  try {
    const c = jwtDecode<Record<string, string>>(idToken);
    return { sub: c.sub, email: c.email, name: c.name, givenName: c.given_name, picture: c.picture };
  } catch {
    return null;
  }
}

function toStored(res: TokenResponse, prev?: StoredTokens | null): StoredTokens {
  return {
    accessToken: res.accessToken,
    // Refresh responses may omit these; keep the previous ones.
    idToken: res.idToken ?? prev?.idToken,
    refreshToken: res.refreshToken ?? prev?.refreshToken,
    expiresAt: res.issuedAt + (res.expiresIn ?? 3600),
  };
}

/** Expo Go demo: no real login. A device id is the identity; Face ID confirms large approvals. */
function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  // New devices start signed out so the sign-in screen follows onboarding.
  useEffect(() => {
    let alive = true;
    hasDemoDevice().then((known) => alive && setStatus(known ? 'signedIn' : 'signedOut'));
    return () => {
      alive = false;
    };
  }, []);

  const getAccessToken = useCallback(() => getDemoToken(), []);

  const stepUp = useCallback(async () => {
    if (!(await confirmWithDevice())) return null;
    await api.stepUp();
    return getDemoToken();
  }, []);

  const logout = useCallback(async () => {
    await clearDemoDevice();
    setStatus('signedOut');
  }, []);

  // Makes the device id on first sign-in, and a new one after logout.
  const login = useCallback(async () => {
    await getDemoToken();
    setStatus('signedIn');
    return true;
  }, []);

  useEffect(
    () =>
      authBridge.register({
        getAccessToken,
        getIdToken: async () => null,
        stepUp,
        onUnauthorized: () => setStatus('signedOut'),
      }),
    [getAccessToken, stepUp],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: null, ready: true, login, logout, getAccessToken, stepUp }),
    [status, login, logout, getAccessToken, stepUp],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const AuthProvider = config.authMode === 'demo' ? DemoAuthProvider : Auth0Provider;

function Auth0Provider({ children }: { children: ReactNode }) {
  const discovery = useAutoDiscovery(`https://${config.auth0.domain}`);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const tokensRef = useRef<StoredTokens | null>(null);
  // Shared in-flight promises so concurrent callers don't double-refresh or double-prompt.
  const refreshing = useRef<Promise<string | null> | null>(null);
  const steppingUp = useRef<Promise<string | null> | null>(null);

  const saveTokens = useCallback(async (tokens: StoredTokens | null) => {
    tokensRef.current = tokens;
    if (tokens) {
      await tokenStore.set(tokens);
      setUser(userFromIdToken(tokens.idToken));
      setStatus('signedIn');
    } else {
      await tokenStore.clear();
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  // Restore the session on launch.
  useEffect(() => {
    tokenStore.get().then((tokens) => {
      tokensRef.current = tokens;
      setUser(userFromIdToken(tokens?.idToken));
      setStatus(tokens ? 'signedIn' : 'signedOut');
    });
  }, []);

  /** Runs the Auth0 Universal Login flow (PKCE) and stores the resulting tokens. */
  const authorize = useCallback(
    async (disc: DiscoveryDocument, extraParams: Record<string, string> = {}, forcePrompt = false) => {
      const request = new AuthRequest({
        clientId: config.auth0.clientId,
        redirectUri,
        scopes: SCOPES,
        usePKCE: true,
        prompt: forcePrompt ? Prompt.Login : undefined,
        extraParams: { audience: config.auth0.audience, ...extraParams },
      });
      const result = await request.promptAsync(disc);
      if (result.type !== 'success') return null;

      const res = await exchangeCodeAsync(
        {
          clientId: config.auth0.clientId,
          code: result.params.code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        disc,
      );
      const tokens = toStored(res);
      await saveTokens(tokens);
      return tokens.accessToken;
    },
    [saveTokens],
  );

  const login = useCallback(
    async (opts?: { forcePrompt?: boolean; connection?: string; loginHint?: string }) => {
      if (!discovery) return false;
      const extra: Record<string, string> = {};
      if (opts?.connection) extra.connection = opts.connection;
      if (opts?.loginHint) extra.login_hint = opts.loginHint;
      return (await authorize(discovery, extra, opts?.forcePrompt)) !== null;
    },
    [authorize, discovery],
  );

  const logout = useCallback(async () => {
    // Local sign-out only. Use login({ forcePrompt: true }) to switch accounts.
    await saveTokens(null);
  }, [saveTokens]);

  const getAccessToken = useCallback(async () => {
    const tokens = tokensRef.current;
    if (!tokens) return null;
    if (tokens.expiresAt - EXPIRY_SKEW_S > Date.now() / 1000) return tokens.accessToken;
    if (!tokens.refreshToken || !discovery) return null;

    refreshing.current ??= refreshAsync(
      { clientId: config.auth0.clientId, refreshToken: tokens.refreshToken },
      discovery,
    )
      .then(async (res) => {
        const next = toStored(res, tokens);
        await saveTokens(next);
        return next.accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [discovery, saveTokens]);

  // Large approvals: Face ID on the device for now (not a second Auth0 sign-in). The API accepts
  // POST /me/step-up for 5 minutes.
  const stepUp = useCallback(async () => {
    steppingUp.current ??= (async () => {
      if (!(await confirmWithDevice())) return null;
      await api.stepUp();
      return getAccessToken();
    })()
      .catch(() => null)
      .finally(() => {
        steppingUp.current = null;
      });
    return steppingUp.current;
  }, [getAccessToken]);

  useEffect(
    () =>
      authBridge.register({
        getAccessToken,
        getIdToken: async () => tokensRef.current?.idToken ?? null,
        stepUp,
        onUnauthorized: () => void saveTokens(null),
      }),
    [getAccessToken, stepUp, saveTokens],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      ready: discovery !== null,
      login,
      logout,
      getAccessToken,
      stepUp,
    }),
    [status, user, discovery, login, logout, getAccessToken, stepUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
