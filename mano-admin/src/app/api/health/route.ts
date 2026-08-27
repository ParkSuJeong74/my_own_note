export const dynamic = "force-dynamic";

import { isDatabaseReady } from "@/lib/db";

export async function GET() {
  const database = await isDatabaseReady();
  return Response.json(
    { status: database ? "ok" : "degraded", service: "mano-admin", database, timestamp: new Date().toISOString() },
    { status: database ? 200 : 503 },
  );
}
