// Lets non-React code (the API client) reach the auth session owned by
// AuthProvider. AuthProvider registers its handlers on mount.

export interface AuthHandlers {
  /** Valid access token (refreshed if needed), or null when signed out. */
  getAccessToken: () => Promise<string | null>;
  /** Auth0 ID token from the last login (its auth_time proves a recent step-up), or null. */
  getIdToken: () => Promise<string | null>;
  /** Re-authenticate (fresh login); resolves to the new access token or null if cancelled. */
  stepUp: () => Promise<string | null>;
  /** Called on a 401: drop the session and go back to Welcome. */
  onUnauthorized: () => void;
}

const signedOut: AuthHandlers = {
  getAccessToken: async () => null,
  getIdToken: async () => null,
  stepUp: async () => null,
  onUnauthorized: () => {},
};

let handlers: AuthHandlers = signedOut;

export const authBridge = {
  register(next: AuthHandlers) {
    handlers = next;
    return () => {
      if (handlers === next) handlers = signedOut;
    };
  },
  getAccessToken: () => handlers.getAccessToken(),
  getIdToken: () => handlers.getIdToken(),
  stepUp: () => handlers.stepUp(),
  onUnauthorized: () => handlers.onUnauthorized(),
};
