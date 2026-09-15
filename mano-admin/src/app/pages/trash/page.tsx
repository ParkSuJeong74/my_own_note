import Link from "next/link";
import { listArchivedWorkspacePages } from "@/lib/block-workspace-repository";
import { restoreWorkspacePageAction } from "../actions";

export const dynamic = "force-dynamic";
export default async function WorkspaceTrashPage(){const pages=await listArchivedWorkspacePages();return <><header className="page-head"><div><p className="eyebrow">WORKSPACE</p><h1>휴지통</h1><p>페이지를 복구할 수 있습니다. 영구 삭제는 아직 제공하지 않습니다.</p></div><Link href="/pages">← Pages</Link></header><section className="workspace-trash">{pages.map(page=><article key={page.id}><div><strong>{page.title||"제목 없음"}</strong><small>{new Date(page.updatedAt).toLocaleString("ko-KR")}</small></div><form action={restoreWorkspacePageAction}><input type="hidden" name="id" value={page.id}/><button className="secondary">복구</button></form></article>)}{pages.length===0&&<div className="workspace-empty">휴지통이 비어 있습니다.</div>}</section></>}
