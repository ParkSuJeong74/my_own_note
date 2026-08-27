import { NextResponse } from "next/server";
import { createTask, listTasks } from "@/lib/automation-repository";

export async function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  return NextResponse.json({ tasks: await listTasks(workspace) });
}

export async function POST(request: Request) {
  const body = await request.json() as Record<string, unknown>;
  if (typeof body.workspaceId !== "string" || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "workspaceId and title are required" }, { status: 400 });
  }
  const priority = typeof body.priority === "string" ? body.priority : "normal";
  if (!["low", "normal", "high"].includes(priority)) return NextResponse.json({ error: "invalid priority" }, { status: 400 });
  const id = await createTask({ workspaceId: body.workspaceId, title: body.title.trim(), description: typeof body.description === "string" ? body.description : "", priority });
  return NextResponse.json({ id }, { status: 201 });
}
