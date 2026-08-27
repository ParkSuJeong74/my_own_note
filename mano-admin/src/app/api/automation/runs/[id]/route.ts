import { NextResponse } from "next/server";
import { updateRun } from "@/lib/automation-repository";

const runStatuses = ["queued", "running", "succeeded", "failed"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  if (typeof body.status !== "string" || !runStatuses.includes(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  return await updateRun(id, { status: body.status, summary: typeof body.summary === "string" ? body.summary : undefined })
    ? NextResponse.json({ id, status: body.status })
    : NextResponse.json({ error: "run not found" }, { status: 404 });
}
