import { notFound } from "next/navigation";
import { updateTaskContentAction, updateTaskStatusAction } from "@/app/automation/actions";
import { PromptPanel } from "@/components/prompt-panel";
import { getTask } from "@/lib/automation-repository";
import { taskStatuses } from "@/lib/automation-types";
import { buildChatGptPrompt, buildCodexPrompt } from "@/lib/task-prompts";

export const dynamic="force-dynamic";
const field=(name:string,label:string,value:string|undefined,area=false,placeholder="")=><label><span>{label}</span>{area?<textarea name={name} defaultValue={value} placeholder={placeholder}/>:<input name={name} defaultValue={value} placeholder={placeholder}/>}</label>;

export default async function TaskDetailPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const task=await getTask(id);if(!task)notFound();
  const references=task.references.map((r)=>`${r.label} | ${r.value}`).join("\n");
  const dueAt=task.dueAt?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(task.dueAt)).replace(" ","T"):"";
  return <><header className="page-head"><div><p className="eyebrow">{task.workspaceName} · {task.taskType}</p><h1>{task.title}</h1><p>Prepare prompts, save human-assisted results, and move the task through review.</p></div><a className="text-link" href="/automation/tasks">← All tasks</a></header>
    <div className="task-status-bar"><form action={updateTaskStatusAction} className="status-form"><input type="hidden" name="id" value={task.id}/><select name="status" defaultValue={task.status}>{taskStatuses.map((s)=><option key={s}>{s}</option>)}</select><button>Update status</button></form><small>Updated {new Date(task.updatedAt).toLocaleString("en-GB")}</small></div>
    <form action={updateTaskContentAction} className="task-editor"><input type="hidden" name="id" value={task.id}/><section className="editor-section"><h2>Task details</h2><div className="form-grid">{field("title","Title",task.title)}<label><span>Priority</span><select name="priority" defaultValue={task.priority}><option>low</option><option>normal</option><option>high</option></select></label><label><span>Due date</span><input type="datetime-local" name="dueAt" defaultValue={dueAt}/></label>{field("description","Description",task.description,true)}{field("inputNotes","Input notes",task.inputNotes,true)}{field("resultText","General result / ChatGPT paste",task.resultText,true)}{field("references","References",references,true,"One per line: Label | URL or /file/path")}</div></section>
      {task.taskType==="BLOG"&&<section className="editor-section"><h2>Blog content</h2><div className="form-grid">{field("sourceMemo","Original memo",task.details.sourceMemo,true)}{field("filePaths","Photo / file paths",task.details.filePaths,true)}{field("generatedTitle","Generated title",task.details.generatedTitle)}{field("generatedBody","Generated body",task.details.generatedBody,true)}{field("keywords","Keywords",task.details.keywords)}</div></section>}
      {task.taskType==="PROJECT"&&<section className="editor-section"><h2>Project delivery</h2><div className="form-grid">{field("issueUrl","Issue URL",task.details.issueUrl)}{field("problemDescription","Problem description",task.details.problemDescription,true)}{field("chatgptAnalysis","ChatGPT analysis",task.details.chatgptAnalysis,true)}{field("codexInstruction","Codex instruction notes",task.details.codexInstruction,true)}{field("codexResult","Codex result",task.details.codexResult,true)}{field("prUrl","Pull request URL",task.details.prUrl)}</div></section>}
      <div className="sticky-actions"><button type="submit">Save task</button></div></form>
    <div className="prompt-grid"><PromptPanel title="ChatGPT prompt" prompt={buildChatGptPrompt(task)} openChatGpt/><PromptPanel title="Codex instruction" prompt={buildCodexPrompt(task)}/></div>
    {(task.references.length>0||task.artifacts.length>0)&&<section className="editor-section linked-items"><h2>Linked items</h2>{task.references.map((r,i)=><div key={`${r.value}-${i}`}><strong>{r.label}</strong>{r.value.startsWith("http")?<a href={r.value} target="_blank" rel="noreferrer">{r.value}</a>:<code>{r.value}</code>}</div>)}{task.artifacts.map((a)=><div key={a.id}><strong>{a.name}</strong><code>{a.path}</code></div>)}</section>}
  </>;
}
