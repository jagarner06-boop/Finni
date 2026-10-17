import type { Request } from "express";
import { auth } from "express-oauth2-jwt-bearer";
import { env } from "./env.js";

// Verifies the Auth0 access token (RS256, audience = our API) on every protected route.
export const checkJwt = auth({
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  audience: env.AUTH0_AUDIENCE,
  tokenSigningAlg: "RS256",
});

export function getSub(req: Request): string {
  const sub = req.auth?.payload.sub;
  if (!sub) throw new Error("Missing sub on authenticated request");
  return sub;
}
