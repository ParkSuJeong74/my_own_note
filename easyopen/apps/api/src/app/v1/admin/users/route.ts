import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/request-auth";
import { listUsers } from "@/lib/repository";
export async function GET() {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(
    { users: await listUsers() },
    { headers: { "cache-control": "private, no-store" } },
  );
}
