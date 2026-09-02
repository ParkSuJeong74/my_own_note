import Link from "next/link";
import { notFound } from "next/navigation";
import { updateWorkspaceAction, updateWorkspaceDirectionAction } from "@/app/workspaces/actions";
import { WorkspaceBoard } from "@/components/workspace-board";
import { BlogDiscovery } from "@/components/blog-discovery";
import { workspaceDetails } from "@/config/workspace-details";
import {
  listTasks,
  listWorkspacePostits,
  listWorkspaces,
  listWorkspaceTodoCategories,
} from "@/lib/automation-repository";
import { getBlogDiscovery } from "@/lib/blog-discovery";

export const dynamic = "force-dynamic";
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspaces = await listWorkspaces();
  const workspace = workspaces.find((item) => item.slug === slug),
    defaults = workspaceDetails[slug];
  if (!workspace || !defaults) notFound();
  const [tasks, postits, categories, discovery] = await Promise.all([
    listTasks(slug),
    listWorkspacePostits(workspace.id),
    listWorkspaceTodoCategories(workspace.id),
    slug === "blog" ? getBlogDiscovery(workspace.id) : Promise.resolve(null),
  ]);
  const detail = {
    ...defaults,
    ...workspace.details,
    responsibilities:
      workspace.details.responsibilities ?? defaults.responsibilities,
    workflow: workspace.details.workflow ?? defaults.workflow,
  };
  const editableLinks = workspace.links
    .map((link) => `${link.label} | ${link.url}`)
    .join("\n");
  return (
    <>
      <header className="page-head workspace-hero">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>{workspace.name}</h1>
          <div className="workspace-quick-links">
            {workspace.links.map((link) => (
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                key={link.url}
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
        <Link className="text-link" href="/workspaces">
          ← All workspaces
        </Link>
      </header>
      <section className="project-direction-panel">
        <div><p className="eyebrow">PROJECT DIRECTION</p><h2>전체 발전 방향</h2><p>이 Workspace가 장기적으로 어디로 발전해야 하는지 기록합니다.</p></div>
        <form action={updateWorkspaceDirectionAction}><input type="hidden" name="id" value={workspace.id}/><input type="hidden" name="slug" value={workspace.slug}/><textarea name="direction" defaultValue={workspace.details.direction ?? ""} maxLength={10000} placeholder="프로젝트의 장기 방향, 우선순위, 원칙과 아이디어를 적어 주세요."/><div className="editor-actions"><button>Save direction</button></div></form>
      </section>
      <div className="workspace-control-link">
        <div>
          <strong>AI Automation</strong>
          <span>
            {workspace.aiAutomationEnabled
              ? `${workspace.workspaceType} · Enabled`
              : "Not configured"}
          </span>
        </div>
        <Link href={`/workspaces/${slug}/automation`}>
          Open project control →
        </Link>
      </div>
      {discovery && (
        <BlogDiscovery
          workspaceId={workspace.id}
          configured={discovery.configured}
          foodKeywords={discovery.foodKeywords}
          travelKeywords={discovery.travelKeywords}
          contentKeywords={discovery.contentKeywords}
          recentYears={discovery.recentYears}
          lastKeyword={discovery.lastKeyword}
          error={discovery.error}
          items={discovery.items}
          exclusionIds={discovery.exclusionIds}
        />
      )}
      <WorkspaceBoard
        workspaceId={workspace.id}
        slug={slug}
        postits={postits}
        categories={categories}
      />
      <section className="section-head">
        <div>
          <p className="eyebrow">RECENT WORK</p>
          <h2>Latest Tasks</h2>
        </div>
        <Link href={`/automation/tasks?workspace=${slug}`}>View all →</Link>
      </section>
      <section className="data-list">
        {tasks.slice(0, 5).map((task) => (
          <article key={task.id}>
            <div className="data-main">
              <div className="data-meta">
                <span>{task.status.replaceAll("_", " ")}</span>
                <span>{task.priority}</span>
              </div>
              <h2>
                <Link href={`/automation/tasks/${task.id}`}>{task.title}</Link>
              </h2>
              <p>{task.description || "No description"}</p>
            </div>
            {task.dueAt && (
              <small>
                Due{" "}
                {new Date(task.dueAt).toLocaleString("en-GB", {
                  timeZone: "Asia/Seoul",
                })}
              </small>
            )}
          </article>
        ))}
      </section>
      {tasks.length === 0 && (
        <div className="empty-state">No Tasks in this Workspace yet.</div>
      )}
      <details className="workspace-settings">
        <summary>Edit Workspace content</summary>
        <form action={updateWorkspaceAction}>
          <input type="hidden" name="id" value={workspace.id} />
          <input type="hidden" name="slug" value={workspace.slug} />
          <input type="hidden" name="direction" value={workspace.details.direction ?? ""} />
          <div className="form-grid">
            <label>
              <span>Name</span>
              <input
                name="name"
                defaultValue={workspace.name}
                required
                maxLength={80}
              />
            </label>
            <label>
              <span>Catalog description</span>
              <input
                name="description"
                defaultValue={workspace.description}
                maxLength={300}
              />
            </label>
            <label>
              <span>Page summary</span>
              <textarea name="summary" defaultValue={detail.summary} />
            </label>
            <label>
              <span>Role and purpose</span>
              <textarea name="purpose" defaultValue={detail.purpose} />
            </label>
            <label>
              <span>Responsibilities</span>
              <textarea
                name="responsibilities"
                defaultValue={detail.responsibilities.join("\n")}
                placeholder="One item per line"
              />
            </label>
            <label>
              <span>Recommended workflow</span>
              <textarea
                name="workflow"
                defaultValue={detail.workflow.join("\n")}
                placeholder="One step per line"
              />
            </label>
            <label>
              <span>Task guidance</span>
              <textarea
                name="taskGuidance"
                defaultValue={detail.taskGuidance}
              />
            </label>
            <label>
              <span>Resource links</span>
              <textarea
                name="links"
                defaultValue={editableLinks}
                placeholder="Label | https://example.com\nOne link per line"
              />
            </label>
          </div>
          <div className="editor-actions">
            <button>Save Workspace</button>
          </div>
        </form>
      </details>
    </>
  );
}
