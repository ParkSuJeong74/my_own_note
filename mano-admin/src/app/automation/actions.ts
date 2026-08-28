"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAutomationInstruction, createTask, decideApproval, deleteAutomationInstruction, getTask, setTaskRepositories, updateAutomationInstruction, updateTaskContent, updateTaskStatus } from "@/lib/automation-repository";
import { taskStatuses, type TaskStatus } from "@/lib/automation-types";
import { parseReferences } from "@/lib/task-prompts";
import { approveExecutionMerge, completeInfrastructureExecution, enqueueTask, requestRevision, retryExecution } from "@/lib/automation-control";

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
export async function enqueueTaskAction(formData:FormData){const id=String(formData.get("taskId")??"");if(!id)return;await enqueueTask(id);revalidatePath("/automation/runs");revalidatePath("/automation/tasks");revalidatePath(`/automation/tasks/${id}`);}
export async function requestExecutionRevisionAction(formData:FormData){const id=String(formData.get("executionId")??""),note=String(formData.get("note")??"").trim();if(!id||!note)return;await requestRevision(id,note);revalidatePath("/automation/runs");}
export async function approveExecutionMergeAction(formData:FormData){const id=String(formData.get("executionId")??"");if(!id)return;await approveExecutionMerge(id);revalidatePath("/automation/runs");revalidatePath("/automation/tasks");}
export async function createGlobalInstructionAction(formData:FormData){const title=String(formData.get("title")??"").trim(),content=String(formData.get("content")??"").trim();if(!title||!content)return;await createAutomationInstruction({scope:"GLOBAL",workspaceId:null,repositoryId:null,title,content});revalidatePath("/automation/instructions");}
export async function updateGlobalInstructionAction(formData:FormData){const id=String(formData.get("id")??""),title=String(formData.get("title")??"").trim(),content=String(formData.get("content")??"").trim();if(!id||!title||!content)return;await updateAutomationInstruction(id,{title,content,enabled:formData.get("enabled")==="on"});revalidatePath("/automation/instructions");}
export async function deleteGlobalInstructionAction(formData:FormData){const id=String(formData.get("id")??"");if(!id)return;await deleteAutomationInstruction(id);revalidatePath("/automation/instructions");}
export async function retryExecutionAction(formData:FormData){const id=String(formData.get("executionId")??"");if(!id)return;await retryExecution(id);revalidatePath("/automation/runs");}
export async function completeInfrastructureExecutionAction(formData:FormData){const id=String(formData.get("executionId")??"");if(!id)return;await completeInfrastructureExecution(id);revalidatePath("/automation/runs");revalidatePath("/automation/tasks");}
