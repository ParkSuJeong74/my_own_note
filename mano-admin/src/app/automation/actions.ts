"use server";

import { revalidatePath } from "next/cache";
import { createTask, decideApproval, updateTaskStatus } from "@/lib/automation-repository";
import { taskStatuses, type TaskStatus } from "@/lib/automation-types";

export async function createTaskAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  if (!workspaceId || !title || !["low", "normal", "high"].includes(priority)) return;
  await createTask({ workspaceId, title, description, priority });
  revalidatePath("/automation/tasks"); revalidatePath("/workspaces");
}

export async function updateTaskStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!id || !taskStatuses.includes(status)) return;
  await updateTaskStatus(id, status);
  revalidatePath("/automation/tasks"); revalidatePath("/workspaces");
}

export async function decideApprovalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) return;
  await decideApproval(id, decision as "approved" | "rejected");
  revalidatePath("/automation/approvals"); revalidatePath("/automation/tasks");
}
