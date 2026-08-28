"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTask, decideApproval, getTask, setTaskRepositories, updateTaskContent, updateTaskStatus } from "@/lib/automation-repository";
import { taskStatuses, type TaskStatus } from "@/lib/automation-types";
import { parseReferences } from "@/lib/task-prompts";

export async function createTaskAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  if (!workspaceId || !title || !["low", "normal", "high"].includes(priority)) return;
  const id = await createTask({ workspaceId, title, description, priority });
  revalidatePath("/automation/tasks"); revalidatePath("/workspaces");
  if (id) redirect(`/automation/tasks/${id}`);
}

export async function updateTaskStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  if (!id || !taskStatuses.includes(status)) return;
  await updateTaskStatus(id, status);
  revalidatePath("/automation/tasks"); revalidatePath("/workspaces");
  revalidatePath(`/automation/tasks/${id}`);
}

export async function updateTaskContentAction(formData: FormData) {
  const id=String(formData.get("id")??"");
  const current=await getTask(id);
  if(!current) return;
  const value=(name:string)=>String(formData.get(name)??"").trim();
  const priority=value("priority");
  if(!value("title")||!["low","normal","high"].includes(priority)) return;
  const details=current.taskType==="BLOG"
    ? {sourceMemo:value("sourceMemo"),filePaths:value("filePaths"),generatedTitle:value("generatedTitle"),generatedBody:value("generatedBody"),keywords:value("keywords")}
    : current.taskType==="PROJECT"
      ? {issueUrl:value("issueUrl"),problemDescription:value("problemDescription"),chatgptAnalysis:value("chatgptAnalysis"),codexInstruction:value("codexInstruction"),codexResult:value("codexResult"),prUrl:value("prUrl")}
      : current.details;
  await updateTaskContent(id,{title:value("title"),description:value("description"),priority,inputNotes:value("inputNotes"),resultText:value("resultText"),references:parseReferences(value("references")),details,dueAt:value("dueAt")||null});
  revalidatePath(`/automation/tasks/${id}`);revalidatePath("/automation/tasks");revalidatePath("/workspaces");
}

export async function updateTaskRepositoriesAction(formData:FormData){const id=String(formData.get("id")??"");if(!id)return;await setTaskRepositories(id,formData.getAll("repositoryId").map(String));revalidatePath(`/automation/tasks/${id}`);revalidatePath("/automation/tasks");}

export async function decideApprovalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) return;
  await decideApproval(id, decision as "approved" | "rejected");
  revalidatePath("/automation/approvals"); revalidatePath("/automation/tasks");
}
