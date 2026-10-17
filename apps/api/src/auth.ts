import type { NextFunction, Request, RequestHandler, Response } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { ID_TOKEN_HEADER, MFA_AT_CLAIM, STEP_UP_REQUIRED } from "@finni/shared";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { User } from "./db/schema.js";
import { demoSubFromHeader, stepUpFresh } from "./domain/demoToken.js";
import { env } from "./env.js";
import { HttpError } from "./services/users.js";

// Verifies the Auth0 access token (RS256, audience = our API) on every protected route.
export const checkJwt = auth({
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  audience: env.AUTH0_AUDIENCE,
  tokenSigningAlg: "RS256",
});

/** AUTH_MODE=demo: `Bearer demo.<deviceId>` → user `demo|<deviceId>`; anything else is a 401. */
function demoAuth(req: Request, res: Response, next: NextFunction) {
  const sub = demoSubFromHeader(req.header("authorization"));
  if (!sub) {
    res.status(401).json({ error: "unauthorized", message: "Missing or invalid demo token" });
    return;
  }
  req.auth = { payload: { sub }, header: { alg: "none" }, token: req.header("authorization")!.slice(7) } as Request["auth"];
  next();
}

export const authenticate: RequestHandler = env.AUTH_MODE === "demo" ? demoAuth : checkJwt;

const STEP_UP_MAX_AGE_S = 5 * 60;
const jwks = createRemoteJWKSet(new URL(`https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`));

/** True when the request carries an Auth0 ID token for the same user from a login in the last 5 minutes. */
async function hasFreshLogin(req: Request): Promise<boolean> {
  const idToken = req.header(ID_TOKEN_HEADER);
  if (!idToken) return false;
  try {
    const { payload } = await jwtVerify(idToken, jwks, { issuer: `https://${env.AUTH0_DOMAIN}/`, audience: env.AUTH0_CLIENT_ID });
    return payload.sub === req.auth?.payload.sub && typeof payload.auth_time === "number" && Date.now() / 1000 - payload.auth_time <= STEP_UP_MAX_AGE_S;
  } catch {
    return false;
  }
}

/**
 * Large actions need the user to have just re-authenticated. Accepted proof: a recent MFA claim on the
 * access token (if an Auth0 Action stamps MFA_AT_CLAIM), or an ID token from a login in the last
 * 5 minutes. The app re-logs in and retries after a 403 step_up_required.
 */
export async function requireStepUp(req: Request, user: User): Promise<void> {
  // Demo mode: the app confirmed with Face ID on the device and called POST /me/step-up.
  if (env.AUTH_MODE === "demo") {
    if (stepUpFresh(user.stepUpAt)) return;
    throw new HttpError(403, STEP_UP_REQUIRED, "Confirm it's you to approve this");
  }
  const mfaAt = Number(req.auth?.payload[MFA_AT_CLAIM]);
  if (mfaAt && Date.now() / 1000 - mfaAt <= STEP_UP_MAX_AGE_S) return;
  if (await hasFreshLogin(req)) return;
  throw new HttpError(403, STEP_UP_REQUIRED, "Sign in again to approve this");
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
