// Demo auth (AUTH_MODE=demo): each device sends `Bearer demo.<deviceId>` and becomes user `demo|<deviceId>`.

const DEMO_TOKEN = /^Bearer demo\.([A-Za-z0-9-]{8,64})$/;
export const STEP_UP_MAX_AGE_MS = 5 * 60_000;

export function demoSubFromHeader(authorization: string | undefined): string | null {
  const m = authorization?.match(DEMO_TOKEN);
  return m ? `demo|${m[1]}` : null;
}

/** Large approvals need an on-device confirmation (Face ID) in the last 5 minutes. */
export const stepUpFresh = (stepUpAt: Date | null, now = new Date()): boolean => !!stepUpAt && now.getTime() - stepUpAt.getTime() <= STEP_UP_MAX_AGE_MS;
