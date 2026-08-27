import { db } from "@/lib/db";
import type { Approval, Artifact, AutomationRun, Task, TaskDetails, TaskReference, TaskStatus, Workspace } from "@/lib/automation-types";

export async function listWorkspaces(): Promise<Workspace[]> {
  const { rows } = await db.query(`SELECT w.id,w.slug,w.name,w.description,w.links,count(t.id)::int AS task_count FROM workspaces w LEFT JOIN tasks t ON t.workspace_id=w.id GROUP BY w.id ORDER BY w.name`);
  return rows.map((r) => ({ id:r.id,slug:r.slug,name:r.name,description:r.description,links:r.links,taskCount:r.task_count }));
}

function mapTask(row: any, artifacts: Artifact[]): Task {
  return { id:row.id,workspaceId:row.workspace_id,workspaceSlug:row.workspace_slug,workspaceName:row.workspace_name,title:row.title,description:row.description,taskType:row.task_type,status:row.status,priority:row.priority,inputNotes:row.input_notes,resultText:row.result_text,references:row.reference_items??[],details:row.details??{},createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString(),artifacts:artifacts.filter((a)=>a.taskId===row.id) };
}

export async function listTasks(workspaceSlug?: string): Promise<Task[]> {
  const [{ rows }, artifacts] = await Promise.all([
    db.query(`SELECT t.*,w.slug AS workspace_slug,w.name AS workspace_name FROM tasks t JOIN workspaces w ON w.id=t.workspace_id ${workspaceSlug?"WHERE w.slug=$1":""} ORDER BY t.updated_at DESC`,workspaceSlug?[workspaceSlug]:[]), listArtifacts(),
  ]);
  return rows.map((r)=>mapTask(r,artifacts));
}

export async function getTask(id:string):Promise<Task|null> {
  const [{rows},artifacts]=await Promise.all([db.query(`SELECT t.*,w.slug AS workspace_slug,w.name AS workspace_name FROM tasks t JOIN workspaces w ON w.id=t.workspace_id WHERE t.id=$1`,[id]),listArtifacts(id)]);
  return rows[0]?mapTask(rows[0],artifacts):null;
}

export async function createTask(input:{workspaceId:string;title:string;description:string;priority:string}) {
  const {rows}=await db.query(`INSERT INTO tasks(workspace_id,title,description,priority,task_type) SELECT id,$2,$3,$4,CASE WHEN slug='blog' THEN 'BLOG' WHEN slug IN ('project-a','project-t') THEN 'PROJECT' ELSE 'GENERAL' END FROM workspaces WHERE id=$1 RETURNING id`,[input.workspaceId,input.title,input.description,input.priority]);
  return rows[0]?.id as string|undefined;
}
export async function updateTaskStatus(id:string,status:TaskStatus) { const r=await db.query("UPDATE tasks SET status=$2,updated_at=now() WHERE id=$1",[id,status]);return r.rowCount===1; }
export async function updateTaskContent(id:string,input:{title:string;description:string;priority:string;inputNotes:string;resultText:string;references:TaskReference[];details:TaskDetails}) { const r=await db.query(`UPDATE tasks SET title=$2,description=$3,priority=$4,input_notes=$5,result_text=$6,reference_items=$7::jsonb,details=$8::jsonb,updated_at=now() WHERE id=$1`,[id,input.title,input.description,input.priority,input.inputNotes,input.resultText,JSON.stringify(input.references),JSON.stringify(input.details)]);return r.rowCount===1; }

export async function listApprovals():Promise<Approval[]> { const {rows}=await db.query(`SELECT a.*,t.title AS task_title,w.name AS workspace_name FROM approvals a JOIN tasks t ON t.id=a.task_id JOIN workspaces w ON w.id=t.workspace_id ORDER BY a.requested_at DESC`);return rows.map((r)=>({id:r.id,taskId:r.task_id,taskTitle:r.task_title,workspaceName:r.workspace_name,status:r.status,note:r.note,requestedAt:r.requested_at.toISOString(),decidedAt:r.decided_at?.toISOString()??null})); }
export async function decideApproval(id:string,decision:"approved"|"rejected") { const c=await db.connect();try{await c.query("BEGIN");const {rows}=await c.query(`UPDATE approvals SET status=$2,decided_at=now() WHERE id=$1 AND status='pending' RETURNING task_id`,[id,decision]);if(!rows[0]){await c.query("ROLLBACK");return false;}await c.query("UPDATE tasks SET status=$2,updated_at=now() WHERE id=$1",[rows[0].task_id,decision==="approved"?"IN_PROGRESS":"DRAFT"]);await c.query("COMMIT");return true;}catch(e){await c.query("ROLLBACK");throw e;}finally{c.release();} }
export async function listRuns():Promise<AutomationRun[]> { const {rows}=await db.query(`SELECT r.*,t.title AS task_title,w.name AS workspace_name FROM automation_runs r JOIN tasks t ON t.id=r.task_id JOIN workspaces w ON w.id=t.workspace_id ORDER BY r.started_at DESC`);return rows.map((r)=>({id:r.id,taskId:r.task_id,taskTitle:r.task_title,workspaceName:r.workspace_name,status:r.status,workflowRef:r.workflow_ref,summary:r.summary,startedAt:r.started_at.toISOString(),finishedAt:r.finished_at?.toISOString()??null})); }
export async function createRun(input:{taskId:string;status?:string;workflowRef?:string;summary?:string}) { const {rows}=await db.query(`INSERT INTO automation_runs(task_id,status,workflow_ref,summary) VALUES($1,$2,$3,$4) RETURNING id`,[input.taskId,input.status??"queued",input.workflowRef??null,input.summary??""]);return rows[0].id as string; }
export async function updateRun(id:string,input:{status:string;summary?:string}) { const r=await db.query(`UPDATE automation_runs SET status=$2,summary=COALESCE($3,summary),finished_at=CASE WHEN $2 IN ('succeeded','failed') THEN now() ELSE finished_at END WHERE id=$1`,[id,input.status,input.summary??null]);return r.rowCount===1; }
export async function listArtifacts(taskId?:string):Promise<Artifact[]> { const {rows}=await db.query(`SELECT id,task_id,run_id,name,path,kind FROM artifacts ${taskId?"WHERE task_id=$1":""} ORDER BY created_at DESC`,taskId?[taskId]:[]);return rows.map((r)=>({id:r.id,taskId:r.task_id,runId:r.run_id,name:r.name,path:r.path,kind:r.kind})); }
