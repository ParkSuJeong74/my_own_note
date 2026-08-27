import type { Task } from "@/lib/automation-types";

export function parseReferences(value:string) {
  return value.split("\n").map((line)=>line.trim()).filter(Boolean).map((line)=>{ const separator=line.indexOf("|"); return separator<0?{label:line.startsWith("/")?"File path":"Link",value:line}:{label:line.slice(0,separator).trim()||"Reference",value:line.slice(separator+1).trim()}; }).filter((item)=>item.value);
}
export function buildChatGptPrompt(task:Task) {
  if(task.taskType==="BLOG") return `You are helping draft a blog post.\n\nTask: ${task.title}\nOriginal memo:\n${task.details.sourceMemo||task.inputNotes||"(none)"}\nPhoto/file paths:\n${task.details.filePaths||"(none)"}\nAdditional context:\n${task.description||"(none)"}\n\nReturn a clear title, polished body, and comma-separated keywords. Do not invent facts that are not in the source.`;
  if(task.taskType==="PROJECT") return `Analyze this software task before implementation.\n\nProject: ${task.workspaceName}\nTask: ${task.title}\nIssue: ${task.details.issueUrl||"(none)"}\nPriority: ${task.priority}\nProblem description:\n${task.details.problemDescription||task.description||task.inputNotes||"(none)"}\n\nReturn: problem summary, likely causes, proposed implementation plan, test plan, and risks/questions. Do not claim that code was changed.`;
  return `Help analyze and prepare this task.\n\nWorkspace: ${task.workspaceName}\nTask: ${task.title}\nDescription: ${task.description||"(none)"}\nInput notes:\n${task.inputNotes||"(none)"}\n\nReturn a concise plan, expected output, and open questions.`;
}
export function buildCodexPrompt(task:Task) {
  return `Implement the following task in the appropriate repository.\n\nWorkspace: ${task.workspaceName}\nTask: ${task.title}\nPriority: ${task.priority}\nIssue: ${task.details.issueUrl||"(none)"}\nProblem/context:\n${task.details.problemDescription||task.description||task.inputNotes||"(none)"}\n\nChatGPT analysis:\n${task.details.chatgptAnalysis||task.resultText||"(none)"}\n\nRequirements:\n- Inspect the existing repository conventions before editing.\n- Keep changes scoped to this task.\n- Run relevant tests and report the results.\n- Summarize changed files and any remaining risks.\n- Do not publish or deploy unless explicitly requested.`;
}
