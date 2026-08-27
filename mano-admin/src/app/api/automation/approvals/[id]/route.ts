import { NextResponse } from "next/server";
import { decideApproval } from "@/lib/automation-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  if (body.decision !== "approved" && body.decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }
  return await decideApproval(id, body.decision)
    ? NextResponse.json({ id, status: body.decision })
    : NextResponse.json({ error: "pending approval not found" }, { status: 404 });
}
