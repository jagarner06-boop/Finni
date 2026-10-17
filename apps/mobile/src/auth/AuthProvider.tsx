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
import { MFA_ACR } from '@finni/shared';
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
import { authBridge } from './authBridge';
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
  login: (opts?: { forcePrompt?: boolean }) => Promise<boolean>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  /** MFA re-auth for large approvals; resolves to the new access token or null. */
  stepUp: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SCOPES = ['openid', 'profile', 'email', 'offline_access'];
const EXPIRY_SKEW_S = 60;

export const redirectUri = makeRedirectUri({ scheme: 'finni' });

const MOCK_USER: AuthUser = { sub: 'mock|alex', email: 'alex@finni.app', name: 'Alex', givenName: 'Alex' };

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

export function AuthProvider({ children }: { children: ReactNode }) {
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
    if (config.useMocks) {
      setUser(MOCK_USER);
      setStatus('signedIn');
      return;
    }
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
    async (opts?: { forcePrompt?: boolean }) => {
      if (config.useMocks) {
        setUser(MOCK_USER);
        setStatus('signedIn');
        return true;
      }
      if (!discovery) return false;
      return (await authorize(discovery, {}, opts?.forcePrompt)) !== null;
    },
    [authorize, discovery],
  );

  const logout = useCallback(async () => {
    // Local sign-out only. Use login({ forcePrompt: true }) to switch accounts.
    await saveTokens(null);
  }, [saveTokens]);

  const getAccessToken = useCallback(async () => {
    if (config.useMocks) return 'mock-token';
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

  const stepUp = useCallback(async () => {
    if (config.useMocks) return 'mock-token-mfa';
    if (!discovery) return null;
    steppingUp.current ??= authorize(discovery, { acr_values: MFA_ACR }, true)
      .catch(() => null)
      .finally(() => {
        steppingUp.current = null;
      });
    return steppingUp.current;
  }, [authorize, discovery]);

  useEffect(
    () =>
      authBridge.register({
        getAccessToken,
        stepUp,
        onUnauthorized: () => void saveTokens(null),
      }),
    [getAccessToken, stepUp, saveTokens],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      ready: config.useMocks || discovery !== null,
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
