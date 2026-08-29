import { notFound } from "next/navigation";
import { saveTaskSetupAction } from "@/app/automation/actions";
import { PromptPanel } from "@/components/prompt-panel";
import { AutomationHelp } from "@/components/automation-help";
import { DeleteTaskButton } from "@/components/delete-task-button";
import { getTask, listAutomationRepositories } from "@/lib/automation-repository";
import { buildChatGptPrompt, buildCodexPrompt } from "@/lib/task-prompts";

export const dynamic="force-dynamic";
const field=(name:string,label:string,value:string|undefined,area=false,placeholder="")=><label><span>{label}</span>{area?<textarea name={name} defaultValue={value} placeholder={placeholder}/>:<input name={name} defaultValue={value} placeholder={placeholder}/>}</label>;

export default async function TaskDetailPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const task=await getTask(id);if(!task)notFound();const repositories=await listAutomationRepositories(task.workspaceId);
  const references=task.references.map((r)=>`${r.label} | ${r.value}`).join("\n");
  const dueAt=task.dueAt?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(task.dueAt)).replace(" ","T"):"";
  return <><header className="page-head"><div><p className="eyebrow">{task.workspaceName} · {task.taskType}</p><h1>{task.title}</h1><p>요청 내용과 저장소를 확인하고 바로 실행할 수 있습니다.</p></div><a className="text-link" href="/automation/tasks">← 모든 작업</a></header>
    <AutomationHelp steps={["요청 내용이 맞는지 확인하세요.", "코드를 수정할 저장소를 선택하세요.", "‘저장 후 실행’을 누르면 끝입니다."]} risk="선택한 저장소의 코드가 수정되고 PR이 생성됩니다. 배포는 아직 되지 않지만, 나중에 병합할 때는 변경 내용을 꼭 확인하세요."/>
    <form action={saveTaskSetupAction} className="task-editor simple-task-editor"><input type="hidden" name="id" value={task.id}/><section className="editor-section"><h2>무엇을 해드릴까요?</h2><div className="form-grid simple-task-fields">{field("title","작업 이름",task.title)}{field("description","요청 내용",task.description,true,"바꾸고 싶은 내용과 원하는 결과를 편하게 적어주세요.")}</div></section>
      {repositories.length>0&&<section className="editor-section"><h2>어느 저장소에서 작업할까요?</h2><p className="section-hint">보통은 기본 선택 그대로 두면 됩니다.</p><div className="repository-checks">{repositories.map((repository)=><label key={repository.id}><input type="checkbox" name="repositoryId" value={repository.id} defaultChecked={task.repositories.some((item)=>item.id===repository.id)||repositories.length===1} disabled={!repository.enabled}/><span><strong>{repository.name}</strong><small>{repository.owner}/{repository.repo} · {repository.defaultBranch}</small></span></label>)}</div></section>}
      <details className="editor-section advanced-task"><summary>고급 설정 · 선택사항</summary><div className="form-grid"><label><span>우선순위</span><select name="priority" defaultValue={task.priority}><option value="low">낮음</option><option value="normal">보통</option><option value="high">높음</option></select></label><label><span>기한</span><input type="datetime-local" name="dueAt" defaultValue={dueAt}/></label>{field("inputNotes","추가 메모",task.inputNotes,true)}{field("resultText","ChatGPT 결과",task.resultText,true)}{field("references","참고 링크 및 파일",references,true,"한 줄에 하나: 이름 | URL 또는 파일 경로")}
        {task.taskType==="BLOG"&&<>{field("sourceMemo","원본 메모",task.details.sourceMemo,true)}{field("filePaths","사진 / 파일 경로",task.details.filePaths,true)}{field("generatedTitle","생성된 제목",task.details.generatedTitle)}{field("generatedBody","생성된 본문",task.details.generatedBody,true)}{field("keywords","키워드",task.details.keywords)}</>}
        {task.taskType==="PROJECT"&&<>{field("issueUrl","이슈 URL",task.details.issueUrl)}{field("problemDescription","문제 설명",task.details.problemDescription,true)}{field("chatgptAnalysis","ChatGPT 분석",task.details.chatgptAnalysis,true)}{field("codexInstruction","Codex 추가 지시",task.details.codexInstruction,true)}{field("codexResult","Codex 결과",task.details.codexResult,true)}{field("prUrl","Pull Request URL",task.details.prUrl)}</>}
      </div></details>
      <div className="sticky-actions task-primary-actions"><button type="submit" name="intent" value="save" className="secondary">나중에 하기</button><button type="submit" name="intent" value="queue" disabled={repositories.length===0}>AI 작업 시작</button></div></form>
    <details className="prompt-details"><summary>생성된 AI 프롬프트 보기</summary><div className="prompt-grid"><PromptPanel title="ChatGPT prompt" prompt={buildChatGptPrompt(task)} openChatGpt/><PromptPanel title="Codex instruction" prompt={buildCodexPrompt(task)}/></div></details>
    {(task.references.length>0||task.artifacts.length>0)&&<section className="editor-section linked-items"><h2>Linked items</h2>{task.references.map((r,i)=><div key={`${r.value}-${i}`}><strong>{r.label}</strong>{r.value.startsWith("http")?<a href={r.value} target="_blank" rel="noreferrer">{r.value}</a>:<code>{r.value}</code>}</div>)}{task.artifacts.map((a)=><div key={a.id}><strong>{a.name}</strong><code>{a.path}</code></div>)}</section>}
    <section className="task-danger-zone"><div><strong>Task 삭제</strong><p>Task와 Mano의 실행 기록을 삭제합니다. 이미 GitHub에 생성된 브랜치와 PR은 남습니다.</p></div><DeleteTaskButton id={task.id}/></section>
  </>;
}
