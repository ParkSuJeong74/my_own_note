import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

import type { AccessIdentity } from "./types";

export interface AccessAuthConfig {
  readonly issuer: string;
  readonly audience: string;
}

export type AccessAuthenticator = (request: Request) => Promise<AccessIdentity>;

export class AccessAuthenticationError extends Error {
  constructor() {
    super("Cloudflare Access authentication failed");
  }
}

export function normalizeAccessIssuer(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("MANO_ACCESS_ISSUER must be a valid URL");
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".cloudflareaccess.com") || url.pathname !== "/") {
    throw new Error("MANO_ACCESS_ISSUER must be an HTTPS Cloudflare Access team origin");
  }
  return url.origin;
}

export function createAccessAuthenticator(
  config: AccessAuthConfig,
  keySet?: JWTVerifyGetKey,
): AccessAuthenticator {
  const issuer = normalizeAccessIssuer(config.issuer);
  if (config.audience.trim().length === 0) throw new Error("MANO_ACCESS_AUDIENCE is required");
  const keys = keySet ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  return async (request) => {
    const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!assertion) throw new AccessAuthenticationError();
    try {
      const { payload } = await jwtVerify(assertion, keys, {
        issuer,
        audience: config.audience,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "email"],
      });
      if (typeof payload.sub !== "string" || payload.sub.length === 0 ||
          typeof payload.email !== "string" || payload.email.length === 0) {
        throw new AccessAuthenticationError();
      }
      return { issuer, subject: payload.sub, email: payload.email };
    } catch {
      throw new AccessAuthenticationError();
    }
  };
}
