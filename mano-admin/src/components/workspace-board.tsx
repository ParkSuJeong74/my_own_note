import { createPostitAction, createTodoAction, createTodoCategoryAction, deletePostitAction, deleteTodoAction, deleteTodoCategoryAction, toggleTodoAction, updatePostitAction } from "@/app/workspaces/actions";
import type { WorkspacePostit, WorkspaceTodoCategory } from "@/lib/automation-types";

function MarkdownNote({content}:{content:string}){
  return <div className="postit-markdown">{content.split("\n").map((line,index)=>{
    if(line.startsWith("### "))return <h4 key={index}>{line.slice(4)}</h4>;
    if(line.startsWith("## "))return <h3 key={index}>{line.slice(3)}</h3>;
    if(line.startsWith("# "))return <h2 key={index}>{line.slice(2)}</h2>;
    if(/^[-*] \[[ xX]\] /.test(line))return <p className="markdown-check" key={index}>{/[xX]/.test(line.slice(0,6))?"☑":"☐"} {line.slice(6)}</p>;
    if(/^[-*] /.test(line))return <p className="markdown-list" key={index}>• {line.slice(2)}</p>;
    return line?<p key={index}>{line}</p>:<br key={index}/>;
  })}</div>;
}

const hidden=(name:string,value:string)=><input type="hidden" name={name} value={value}/>;
const colors=["yellow","blue","pink","purple","green"];

export function WorkspaceBoard({workspaceId,slug,postits,categories}:{workspaceId:string;slug:string;postits:WorkspacePostit[];categories:WorkspaceTodoCategory[]}){
  return <section className="workspace-board">
    <div className="section-head"><div><p className="eyebrow">WORKSPACE BOARD</p><h2>Notes & Todo</h2><p>Keep quick Markdown notes and category-based action lists in this Workspace.</p></div></div>
    <div className="board-layout"><div className="postit-area">
      <details className="board-create"><summary>+ New sticky note</summary><form action={createPostitAction}>{hidden("workspaceId",workspaceId)}{hidden("slug",slug)}<input name="title" placeholder="Note title" maxLength={100}/><textarea name="content" required placeholder="# Memo\n- Markdown supported\n- [ ] Checklist"/><select name="color" defaultValue="yellow">{colors.map((color)=><option key={color}>{color}</option>)}</select><button>Add note</button></form></details>
      <div className="postit-grid">{postits.map((note)=><article className={`workspace-postit ${note.color}`} key={note.id}><div className="postit-pin"/><h3>{note.title||"Untitled note"}</h3><MarkdownNote content={note.content}/><small>{new Date(note.updatedAt).toLocaleDateString("en-CA",{timeZone:"Asia/Seoul"})}</small><details><summary>Edit</summary><form action={updatePostitAction}>{hidden("id",note.id)}{hidden("slug",slug)}<input name="title" defaultValue={note.title} placeholder="Note title"/><textarea name="content" defaultValue={note.content} required/><select name="color" defaultValue={note.color}>{colors.map((color)=><option key={color}>{color}</option>)}</select><div><button>Save</button><button formAction={deletePostitAction} className="danger">Delete</button></div></form></details></article>)}</div>
      {postits.length===0&&<div className="board-empty">No sticky notes yet.</div>}
    </div><aside className="todo-board">
      <details className="board-create"><summary>+ New category</summary><form action={createTodoCategoryAction}>{hidden("workspaceId",workspaceId)}{hidden("slug",slug)}<input name="name" required placeholder="Category name"/><button>Add category</button></form></details>
      {categories.map((category)=><section className="todo-category" key={category.id}><div className="todo-category-head"><h3>{category.name}</h3><form action={deleteTodoCategoryAction}>{hidden("id",category.id)}{hidden("slug",slug)}<button aria-label={`Delete ${category.name}`}>×</button></form></div><div className="todo-list">{category.todos.map((todo)=><article className={todo.completed?"completed":""} key={todo.id}><form action={toggleTodoAction}>{hidden("id",todo.id)}{hidden("slug",slug)}{hidden("completed",String(!todo.completed))}<button className="todo-check" aria-label={todo.completed?"Mark incomplete":"Mark complete"}>{todo.completed?"✓":""}</button></form><div><strong>{todo.title}</strong>{todo.description&&<p>{todo.description}</p>}</div><form action={deleteTodoAction}>{hidden("id",todo.id)}{hidden("slug",slug)}<button className="todo-delete" aria-label={`Delete ${todo.title}`}>×</button></form></article>)}</div><form action={createTodoAction} className="todo-create">{hidden("categoryId",category.id)}{hidden("slug",slug)}<input name="title" required placeholder="Add a todo"/><input name="description" placeholder="Description (optional)"/><button>+</button></form></section>)}
      {categories.length===0&&<div className="board-empty">Create a category such as “Launch”, “Content”, or “Later”.</div>}
    </aside></div>
  </section>;
}
