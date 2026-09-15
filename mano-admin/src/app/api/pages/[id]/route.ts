import { NextResponse } from "next/server";
import { updateWorkspacePageTitle } from "@/lib/block-workspace-repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null) as { title?: unknown; version?: unknown } | null;
  if (!body || typeof body.title !== "string" || !Number.isSafeInteger(body.version) || Number(body.version) < 1) return NextResponse.json({ error: "Invalid page update" }, { status: 400 });
  try {
    const version = await updateWorkspacePageTitle(id, body.title, Number(body.version));
    return version ? NextResponse.json({ version }) : NextResponse.json({ error: "Page changed or missing" }, { status: 409 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid page update" }, { status: 400 }); }
}
