import type { Request } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { MFA_AT_CLAIM, STEP_UP_REQUIRED } from "@finni/shared";
import { env } from "./env.js";
import { HttpError } from "./services/users.js";

// Verifies the Auth0 access token (RS256, audience = our API) on every protected route.
export const checkJwt = auth({
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  audience: env.AUTH0_AUDIENCE,
  tokenSigningAlg: "RS256",
});

const STEP_UP_MAX_AGE_S = 5 * 60;

/**
 * Large actions need a recent MFA. The Auth0 post-login Action stamps MFA_AT_CLAIM (epoch seconds)
 * when the login included MFA; the app retries with a fresh token after a 403 step_up_required.
 */
export function requireStepUp(req: Request): void {
  const mfaAt = Number(req.auth?.payload[MFA_AT_CLAIM]);
  if (!mfaAt || Date.now() / 1000 - mfaAt > STEP_UP_MAX_AGE_S) {
    throw new HttpError(403, STEP_UP_REQUIRED, "Confirm it's you to approve this");
  }
}

export function getSub(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error("Missing sub on authenticated request");
  return sub;
}

/**
 * Auth0 profile for the caller. Access tokens carry no name/email, but the openid scope makes
 * them valid for /userinfo. Best effort: returns {} on any failure.
 */
export async function fetchUserInfo(req: Request): Promise<{ firstName?: string; email?: string }> {
  const token = req.auth?.token;
  if (!token) return {};
  try {
    const res = await fetch(`https://${env.AUTH0_DOMAIN}/userinfo`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return {};
    const info = (await res.json()) as { given_name?: string; name?: string; nickname?: string; email?: string };
    const firstName = info.given_name ?? info.name?.split(" ")[0] ?? info.nickname;
    // Email-only accounts get name = email; don't greet people as "alex@ufl.edu".
    return { firstName: firstName?.includes("@") ? undefined : firstName, email: info.email };
  } catch {
    return {};
  }
}
