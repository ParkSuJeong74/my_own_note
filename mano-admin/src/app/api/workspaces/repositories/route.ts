import { NextResponse } from "next/server";
import { createAutomationRepository, listWorkspaces } from "@/lib/automation-repository";
import { recordAdminError } from "@/lib/admin-errors";

const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const branch = /^(?!\/)(?!.*\.\.)(?!.*\/$)[A-Za-z0-9._/-]{1,255}$/;

function githubParts(input: string) {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
    const parts = url.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    return parts.length === 2 && parts[0] && parts[1] ? { owner: parts[0], repo: parts[1] } : null;
  } catch { return null; }
}

const destination = (request: Request, slug: string, result: string) =>
  NextResponse.redirect(new URL(`/workspaces/${encodeURIComponent(slug)}/automation?repository=${result}`, request.url), 303);

export async function POST(request: Request) {
  if (!request.headers.get("x-mano-admin-user")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await request.formData();
  const workspaceId = value(data, "workspaceId"), slug = value(data, "slug"), gitUrl = value(data, "gitUrl"), defaultBranch = value(data, "defaultBranch"), parts = githubParts(gitUrl);
  if (!uuid.test(workspaceId) || !/^[a-z0-9-]{1,80}$/.test(slug) || !parts || !branch.test(defaultBranch)) return destination(request, slug || "workspaces", "invalid");
  const workspace = (await listWorkspaces()).find(item => item.id === workspaceId && item.slug === slug);
  if (!workspace) return destination(request, slug, "invalid");
  try {
    await createAutomationRepository({ workspaceId, name: value(data, "name").slice(0, 120) || parts.repo, owner: parts.owner, repo: parts.repo, gitUrl, defaultBranch });
    return destination(request, slug, "added");
  } catch (error) {
    await recordAdminError("repository-create", error, { workspaceId, owner: parts.owner, repo: parts.repo });
    return destination(request, slug, "failed");
  }
}
