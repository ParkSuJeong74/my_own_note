import { NextResponse } from "next/server";
import { createRun, listRuns } from "@/lib/automation-repository";

const runStatuses = ["queued", "running", "succeeded", "failed"];

export async function GET() {
  return NextResponse.json({ runs: await listRuns() });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  if (typeof body.taskId !== "string") return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  const status = typeof body.status === "string" ? body.status : "queued";
  if (!runStatuses.includes(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  const id = await createRun({ taskId: body.taskId, status, workflowRef: typeof body.workflowRef === "string" ? body.workflowRef : undefined, summary: typeof body.summary === "string" ? body.summary : undefined });
  return NextResponse.json({ id }, { status: 201 });
}
