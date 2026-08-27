export const taskStatuses = ["DRAFT", "READY", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskType = "GENERAL" | "BLOG" | "PROJECT";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";

export type WorkspaceLink = { label: string; url: string };
export type TaskReference = { label: string; value: string };
export type TaskDetails = Record<string, string>;
export type WorkspaceEditableDetails = { summary?:string; purpose?:string; responsibilities?:string[]; workflow?:string[]; taskGuidance?:string };
export type Workspace = { id: string; slug: string; name: string; description: string; taskCount: number; links: WorkspaceLink[]; details: WorkspaceEditableDetails };
export type Task = {
  id: string; workspaceId: string; workspaceSlug: string; workspaceName: string;
  title: string; description: string; taskType: TaskType; status: TaskStatus;
  priority: string; inputNotes: string; resultText: string;
  references: TaskReference[]; details: TaskDetails;
  dueAt: string | null; createdAt: string; updatedAt: string; artifacts: Artifact[];
};
export type Note = { id:string; workspaceId:string|null; workspaceName:string|null; title:string; body:string; tags:string[]; isPinned:boolean; createdAt:string; updatedAt:string };
export type CalendarEvent = { id:string; workspaceId:string|null; workspaceName:string|null; title:string; description:string; startsAt:string; endsAt:string|null; allDay:boolean; recurrence:"NONE"|"YEARLY"; color:string; completed:boolean };
export type WorkspacePostit = { id:string; workspaceId:string; title:string; content:string; color:"yellow"|"blue"|"pink"|"purple"|"green"; updatedAt:string };
export type WorkspaceTodo = { id:string; categoryId:string; title:string; description:string; completed:boolean };
export type WorkspaceTodoCategory = { id:string; workspaceId:string; name:string; todos:WorkspaceTodo[] };
export type Approval = { id: string; taskId: string; taskTitle: string; workspaceName: string; status: ApprovalStatus; note: string; requestedAt: string; decidedAt: string | null };
export type AutomationRun = { id: string; taskId: string; taskTitle: string; workspaceName: string; status: RunStatus; workflowRef: string | null; summary: string; startedAt: string; finishedAt: string | null };
export type Artifact = { id: string; taskId: string; runId: string | null; name: string; path: string; kind: string };
