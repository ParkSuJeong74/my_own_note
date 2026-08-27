import { NextResponse } from "next/server";
import { getTask, updateTaskStatus } from "@/lib/automation-repository";
import { taskStatuses, type TaskStatus } from "@/lib/automation-types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const task = await getTask((await params).id);
  return task ? NextResponse.json(task) : NextResponse.json({ error: "task not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  if (typeof body.status !== "string" || !taskStatuses.includes(body.status as TaskStatus)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  return await updateTaskStatus(id, body.status as TaskStatus)
    ? NextResponse.json({ id, status: body.status })
    : NextResponse.json({ error: "task not found" }, { status: 404 });
}
