export const taskStatuses = ["DRAFT", "READY", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskType = "GENERAL" | "BLOG" | "PROJECT";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type WorkspaceLink = { label: string; url: string };
export type TaskReference = { label: string; value: string };
export type TaskDetails = Record<string, string>;
export type Workspace = { id: string; slug: string; name: string; description: string; taskCount: number; links: WorkspaceLink[] };
export type Task = {
  id: string; workspaceId: string; workspaceSlug: string; workspaceName: string;
  title: string; description: string; taskType: TaskType; status: TaskStatus;
  priority: string; inputNotes: string; resultText: string;
  references: TaskReference[]; details: TaskDetails;
  createdAt: string; updatedAt: string; artifacts: Artifact[];
};
export type Approval = { id: string; taskId: string; taskTitle: string; workspaceName: string; status: ApprovalStatus; note: string; requestedAt: string; decidedAt: string | null };
export type AutomationRun = { id: string; taskId: string; taskTitle: string; workspaceName: string; status: RunStatus; workflowRef: string | null; summary: string; startedAt: string; finishedAt: string | null };
export type Artifact = { id: string; taskId: string; runId: string | null; name: string; path: string; kind: string };
