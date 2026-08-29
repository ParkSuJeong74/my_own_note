import { timingSafeEqual } from "node:crypto";

export function n8nAuthorized(request: Request) {
  const expected = process.env.MANO_N8N_TOKEN ?? "";
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(given)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
