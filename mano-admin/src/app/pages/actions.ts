"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addWorkspaceParagraph, archiveWorkspacePage, createWorkspacePage, createWorkspacePageUnder, moveWorkspaceBlock, restoreWorkspacePage, setWorkspacePageFavorite } from "@/lib/block-workspace-repository";

export async function createWorkspacePageAction() { redirect(`/pages/${await createWorkspacePage()}`); }
export async function createChildWorkspacePageAction(data: FormData) { const parentId=String(data.get("parentId")??""); if(parentId) redirect(`/pages/${await createWorkspacePageUnder(parentId)}`); }
export async function favoriteWorkspacePageAction(data: FormData) { const id=String(data.get("id")??""); if(id) await setWorkspacePageFavorite(id,data.get("favorite")==="true"); revalidatePath("/pages"); revalidatePath(`/pages/${id}`); }
export async function archiveWorkspacePageAction(data: FormData) { const id=String(data.get("id")??""); if(id) await archiveWorkspacePage(id); revalidatePath("/pages"); revalidatePath("/pages/trash"); redirect("/pages"); }
export async function restoreWorkspacePageAction(data: FormData) { const id=String(data.get("id")??""); if(id) await restoreWorkspacePage(id); revalidatePath("/pages"); revalidatePath("/pages/trash"); }
export async function addWorkspaceParagraphAction(data: FormData) {
  const pageId = String(data.get("pageId") ?? "");
  if (!pageId) return;
  await addWorkspaceParagraph(pageId);
  revalidatePath(`/pages/${pageId}`);
}
export async function moveWorkspaceBlockAction(data:FormData){const pageId=String(data.get("pageId")??""),blockId=String(data.get("blockId")??""),direction=data.get("direction")==="up"?"up":"down";if(pageId&&blockId)await moveWorkspaceBlock(pageId,blockId,direction);revalidatePath(`/pages/${pageId}`);}
