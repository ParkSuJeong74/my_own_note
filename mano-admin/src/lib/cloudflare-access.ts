import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type CloudflareAccessConfig = {
  teamDomain: string;
  audience: string;
  allowedEmail: string;
};

export class AccessIdentityError extends Error {
  readonly code = "ERR_ACCESS_IDENTITY_NOT_ALLOWED";
}

export function getCloudflareAccessConfig(): CloudflareAccessConfig | null {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/$/, "");
  const audience = process.env.CF_ACCESS_AUD?.trim();
  const allowedEmail = process.env.CF_ACCESS_ALLOWED_EMAIL?.trim().toLowerCase();

  if (!teamDomain || !audience || !allowedEmail) return null;

  return {
    teamDomain: teamDomain.startsWith("https://") ? teamDomain : `https://${teamDomain}`,
    audience,
    allowedEmail,
  };
}

export function isAllowedIdentity(payload: JWTPayload, allowedEmail: string): boolean {
  return payload.type === "app"
    && typeof payload.email === "string"
    && payload.email.toLowerCase() === allowedEmail;
}

export async function verifyCloudflareAccessToken(
  token: string,
  config: CloudflareAccessConfig,
): Promise<JWTPayload> {
  const jwks = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", config.teamDomain));
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.teamDomain,
    audience: config.audience,
    algorithms: ["RS256"],
  });

  if (!isAllowedIdentity(payload, config.allowedEmail)) {
    throw new AccessIdentityError("Cloudflare Access identity is not allowed");
  }

  return payload;
}
