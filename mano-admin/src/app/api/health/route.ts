export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "mano-admin", timestamp: new Date().toISOString() });
}
