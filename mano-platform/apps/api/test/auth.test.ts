import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { AccessAuthenticationError, createAccessAuthenticator, normalizeAccessIssuer } from "../src/auth";

const issuer = "https://mano.cloudflareaccess.com";
const audience = "mano-audience";
let privateKey: CryptoKey;
let keySet: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  const publicJwk = await exportJWK(pair.publicKey);
  keySet = createLocalJWKSet({ keys: [{ ...publicJwk, kid: "test-key", alg: "RS256", use: "sig" }] });
});

async function token(overrides: { issuer?: string; audience?: string; email?: string } = {}): Promise<string> {
  return new SignJWT({ email: overrides.email ?? "pilot@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setSubject("access-user-1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("Cloudflare Access authentication", () => {
  it("normalizes only Cloudflare Access HTTPS team origins", () => {
    expect(normalizeAccessIssuer(`${issuer}/`)).toBe(issuer);
    expect(() => normalizeAccessIssuer("http://mano.cloudflareaccess.com")).toThrow();
    expect(() => normalizeAccessIssuer("https://example.com")).toThrow();
    expect(() => normalizeAccessIssuer(`${issuer}/other`)).toThrow();
  });

  it("verifies signature, issuer, audience and identity claims", async () => {
    const authenticate = createAccessAuthenticator({ issuer, audience }, keySet);
    const assertion = await token();
    await expect(authenticate(new Request("https://api.example/v1/me", {
      headers: { "Cf-Access-Jwt-Assertion": assertion },
    }))).resolves.toEqual({ issuer, subject: "access-user-1", email: "pilot@example.com" });
  });

  it("fails closed for missing and wrong-audience assertions", async () => {
    const authenticate = createAccessAuthenticator({ issuer, audience }, keySet);
    await expect(authenticate(new Request("https://api.example/v1/me"))).rejects.toBeInstanceOf(AccessAuthenticationError);
    await expect(authenticate(new Request("https://api.example/v1/me", {
      headers: { "Cf-Access-Jwt-Assertion": await token({ audience: "other" }) },
    }))).rejects.toBeInstanceOf(AccessAuthenticationError);
  });
});
