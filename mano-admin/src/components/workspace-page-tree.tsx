import Link from "next/link";
import { buildWorkspacePageTree } from "@/lib/block-workspace";
import type { WorkspacePageSummary } from "@/lib/block-workspace-repository";

function Branch({ node, depth = 0 }: { node: ReturnType<typeof buildWorkspacePageTree<WorkspacePageSummary>>[number]; depth?: number }) {
  return <><Link href={`/pages/${node.id}`} style={{ paddingLeft: 20 + depth * 22 }}><span>{node.children.length ? "▾" : "▱"}</span><div><strong>{node.title || "제목 없음"}</strong><small>{node.isFavorite ? "★ 즐겨찾기 · " : ""}{new Date(node.updatedAt).toLocaleString("ko-KR")}</small></div></Link>{node.children.map(child => <Branch node={child} depth={depth + 1} key={child.id}/>)}</>;
}

export function WorkspacePageTree({ pages }: { pages: WorkspacePageSummary[] }) {
  return <>{buildWorkspacePageTree(pages).map(node => <Branch node={node} key={node.id}/>)}</>;
}
