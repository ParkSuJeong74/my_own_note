import { NextResponse } from "next/server";
import { updateWorkspaceBlock } from "@/lib/block-workspace-repository";
import { archiveWorkspaceBlock } from "@/lib/block-workspace-repository";
import { workspaceBlockTypes, type WorkspaceBlockType } from "@/lib/block-workspace";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; blockId: string }> }) {
  const { id, blockId } = await params;
  const body = await request.json().catch(() => null) as { content?: unknown; version?: unknown; type?: unknown } | null;
  if (!body || !Number.isSafeInteger(body.version) || Number(body.version) < 1) return NextResponse.json({ error: "Invalid block update" }, { status: 400 });
  if (body.type !== undefined && !workspaceBlockTypes.includes(body.type as WorkspaceBlockType)) return NextResponse.json({ error: "Invalid block type" }, { status: 400 });
  try {
    const result = await updateWorkspaceBlock(id, blockId, body.content, Number(body.version), body.type as WorkspaceBlockType | undefined);
    if (result.status === "missing") return NextResponse.json({ error: "Block not found" }, { status: 404 });
    if (result.status === "conflict") return NextResponse.json({ error: "Block changed elsewhere" }, { status: 409 });
    return NextResponse.json({ version: result.version });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid block update" }, { status: 400 }); }
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string;blockId:string}>}){const{id,blockId}=await params;return await archiveWorkspaceBlock(id,blockId)?NextResponse.json({ok:true}):NextResponse.json({error:"Block not found"},{status:404});}
