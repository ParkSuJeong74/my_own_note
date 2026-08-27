import { db } from "@/lib/db";
import type { Approval, Artifact, AutomationRun, Task, TaskStatus, Workspace } from "@/lib/automation-types";

export async function listWorkspaces(): Promise<Workspace[]> {
  const { rows } = await db.query(`
    SELECT w.id, w.slug, w.name, w.description, count(t.id)::int AS task_count
    FROM workspaces w LEFT JOIN tasks t ON t.workspace_id = w.id
    GROUP BY w.id ORDER BY w.name
  `);
  return rows.map((row) => ({ ...row, taskCount: row.task_count }));
}

export async function listTasks(workspaceSlug?: string): Promise<Task[]> {
  const values: string[] = [];
  const filter = workspaceSlug ? "WHERE w.slug = $1" : "";
  if (workspaceSlug) values.push(workspaceSlug);
  const [{ rows }, artifacts] = await Promise.all([
    db.query(`
      SELECT t.*, w.name AS workspace_name
      FROM tasks t JOIN workspaces w ON w.id = t.workspace_id
      ${filter} ORDER BY t.updated_at DESC
    `, values),
    listArtifacts(),
  ]);
  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    updatedAt: row.updated_at.toISOString(),
    artifacts: artifacts.filter((artifact) => artifact.taskId === row.id),
  }));
}

export async function createTask(input: { workspaceId: string; title: string; description: string; priority: string }) {
  const { rows } = await db.query(
    `INSERT INTO tasks (workspace_id, title, description, priority)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.workspaceId, input.title, input.description, input.priority],
  );
  return rows[0].id as string;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const result = await db.query(
    "UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1",
    [id, status],
  );
  return result.rowCount === 1;
}

export async function listApprovals(): Promise<Approval[]> {
  const { rows } = await db.query(`
    SELECT a.*, t.title AS task_title, w.name AS workspace_name
    FROM approvals a
    JOIN tasks t ON t.id = a.task_id
    JOIN workspaces w ON w.id = t.workspace_id
    ORDER BY a.requested_at DESC
  `);
  return rows.map((row) => ({
    id: row.id, taskId: row.task_id, taskTitle: row.task_title,
    workspaceName: row.workspace_name, status: row.status, note: row.note,
    requestedAt: row.requested_at.toISOString(), decidedAt: row.decided_at?.toISOString() ?? null,
  }));
}

export async function decideApproval(id: string, decision: "approved" | "rejected") {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE approvals SET status = $2, decided_at = now()
       WHERE id = $1 AND status = 'pending' RETURNING task_id`,
      [id, decision],
    );
    if (!rows[0]) { await client.query("ROLLBACK"); return false; }
    await client.query(
      "UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1",
      [rows[0].task_id, decision === "approved" ? "in_progress" : "todo"],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listRuns(): Promise<AutomationRun[]> {
  const { rows } = await db.query(`
    SELECT r.*, t.title AS task_title, w.name AS workspace_name
    FROM automation_runs r
    JOIN tasks t ON t.id = r.task_id
    JOIN workspaces w ON w.id = t.workspace_id
    ORDER BY r.started_at DESC
  `);
  return rows.map((row) => ({
    id: row.id, taskId: row.task_id, taskTitle: row.task_title,
    workspaceName: row.workspace_name, status: row.status,
    workflowRef: row.workflow_ref, summary: row.summary,
    startedAt: row.started_at.toISOString(), finishedAt: row.finished_at?.toISOString() ?? null,
  }));
}

export async function createRun(input: { taskId: string; status?: string; workflowRef?: string; summary?: string }) {
  const { rows } = await db.query(
    `INSERT INTO automation_runs (task_id, status, workflow_ref, summary)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.taskId, input.status ?? "queued", input.workflowRef ?? null, input.summary ?? ""],
  );
  return rows[0].id as string;
}

export async function updateRun(id: string, input: { status: string; summary?: string }) {
  const result = await db.query(
    `UPDATE automation_runs SET status = $2, summary = COALESCE($3, summary),
     finished_at = CASE WHEN $2 IN ('succeeded', 'failed') THEN now() ELSE finished_at END
     WHERE id = $1`,
    [id, input.status, input.summary ?? null],
  );
  return result.rowCount === 1;
}

export async function listArtifacts(): Promise<Artifact[]> {
  const { rows } = await db.query("SELECT id, task_id, run_id, name, path, kind FROM artifacts ORDER BY created_at DESC");
  return rows.map((row) => ({ id: row.id, taskId: row.task_id, runId: row.run_id, name: row.name, path: row.path, kind: row.kind }));
}
