import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspacePageEditor } from "@/components/workspace-page-editor";
import { getWorkspacePage } from "@/lib/block-workspace-repository";
import { addWorkspaceParagraphAction, archiveWorkspacePageAction, createChildWorkspacePageAction, favoriteWorkspacePageAction } from "../actions";

export const dynamic = "force-dynamic";
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params, page = await getWorkspacePage(id);
  if (!page) notFound();
  return <><div className="workspace-editor-head"><Link href="/pages">← 모든 페이지</Link><div className="workspace-editor-actions"><form action={favoriteWorkspacePageAction}><input type="hidden" name="id" value={page.id}/><input type="hidden" name="favorite" value={String(!page.isFavorite)}/><button className="secondary">{page.isFavorite?"★ 즐겨찾기 해제":"☆ 즐겨찾기"}</button></form><form action={createChildWorkspacePageAction}><input type="hidden" name="parentId" value={page.id}/><button className="secondary">+ 하위 페이지</button></form><form action={addWorkspaceParagraphAction}><input type="hidden" name="pageId" value={page.id}/><button className="secondary">+ 텍스트</button></form><form action={archiveWorkspacePageAction}><input type="hidden" name="id" value={page.id}/><button className="secondary danger-text">휴지통</button></form></div></div><WorkspacePageEditor page={page}/></>;
}
