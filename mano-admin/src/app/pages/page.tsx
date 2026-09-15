import Link from "next/link";
import { createWorkspacePageAction } from "./actions";
import { listRecentWorkspacePages, listWorkspacePages } from "@/lib/block-workspace-repository";
import { WorkspacePageTree } from "@/components/workspace-page-tree";

export const dynamic = "force-dynamic";
export default async function PagesPage({searchParams}:{searchParams:Promise<{q?:string}>}) {
  const query=(await searchParams).q?.trim().slice(0,100)??"";
  const [pages,recent]=await Promise.all([listWorkspacePages(query),query?Promise.resolve([]):listRecentWorkspacePages()]);
  return <><header className="page-head"><div><p className="eyebrow">WORKSPACE</p><h1>Pages</h1><p>생각이 생긴 순간 바로 적는 Mano의 새 작업공간입니다.</p></div><div className="workspace-page-actions"><Link href="/pages/trash">휴지통</Link><form action={createWorkspacePageAction}><button>+ 새 페이지</button></form></div></header><form className="workspace-search"><input name="q" defaultValue={query} placeholder="페이지 제목과 내용 검색" aria-label="페이지 검색"/><button className="secondary">검색</button>{query&&<Link href="/pages">초기화</Link>}</form>{recent.length>0&&<section className="workspace-recent"><h2>최근 페이지</h2><div>{recent.map(item=><Link href={`/pages/${item.id}`} key={item.id}>{item.isFavorite?"★ ":""}{item.title||"제목 없음"}</Link>)}</div></section>}<section className="workspace-page-list"><WorkspacePageTree pages={pages}/>{pages.length===0&&<div className="workspace-empty"><h2>{query?"검색 결과가 없어요.":"첫 페이지를 만들어 보세요."}</h2><p>{query?"다른 검색어를 입력해 보세요.":"기존 Mano 데이터는 그대로 유지됩니다."}</p></div>}</section></>;
}
