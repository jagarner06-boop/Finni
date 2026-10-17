// Lets non-React code (the API client) reach the auth session owned by
// AuthProvider. AuthProvider registers its handlers on mount.

export interface AuthHandlers {
  /** Valid access token (refreshed if needed), or null when signed out. */
  getAccessToken: () => Promise<string | null>;
  /** Re-authenticate with MFA; resolves to the new access token or null if cancelled. */
  stepUp: () => Promise<string | null>;
  /** Called on a 401: drop the session and go back to Welcome. */
  onUnauthorized: () => void;
}

const signedOut: AuthHandlers = {
  getAccessToken: async () => null,
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
  stepUp: () => handlers.stepUp(),
  onUnauthorized: () => handlers.onUnauthorized(),
};
