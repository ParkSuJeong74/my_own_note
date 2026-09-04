import { timingSafeEqual } from "node:crypto";

export function n8nAuthorized(request: Request) {
  return bearerAuthorized(request, process.env.MANO_N8N_TOKEN ?? "");
}

export function blogIngestAuthorized(request: Request) {
  return bearerAuthorized(request, process.env.MANO_BLOG_INGEST_TOKEN ?? "");
}

function bearerAuthorized(request: Request, expected: string) {
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(given)) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
