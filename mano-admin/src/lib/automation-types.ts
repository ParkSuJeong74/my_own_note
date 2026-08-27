export const taskStatuses = ["todo", "in_progress", "waiting_approval", "completed", "failed"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type Workspace = { id: string; slug: string; name: string; description: string; taskCount: number };
export type Task = { id: string; workspaceId: string; workspaceName: string; title: string; description: string; status: TaskStatus; priority: string; updatedAt: string; artifacts: Artifact[] };
export type Approval = { id: string; taskId: string; taskTitle: string; workspaceName: string; status: ApprovalStatus; note: string; requestedAt: string; decidedAt: string | null };
export type AutomationRun = { id: string; taskId: string; taskTitle: string; workspaceName: string; status: RunStatus; workflowRef: string | null; summary: string; startedAt: string; finishedAt: string | null };
export type Artifact = { id: string; taskId: string; runId: string | null; name: string; path: string; kind: string };
