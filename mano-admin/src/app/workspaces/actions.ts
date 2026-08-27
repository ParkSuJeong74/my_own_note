"use server";

import { revalidatePath } from "next/cache";
import { createWorkspacePostit, createWorkspaceTodo, createWorkspaceTodoCategory, deleteWorkspacePostit, deleteWorkspaceTodo, deleteWorkspaceTodoCategory, updateWorkspace, updateWorkspacePostit, updateWorkspaceTodoCompleted } from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const lines=(input:string)=>input.split("\n").map((line)=>line.trim()).filter(Boolean);
function links(input:string){return lines(input).flatMap((line)=>{const separator=line.indexOf("|");if(separator<1)return[];const label=line.slice(0,separator).trim(),url=line.slice(separator+1).trim();try{const parsed=new URL(url);return label&&["http:","https:"].includes(parsed.protocol)?[{label,url}]:[];}catch{return[];}});}

export async function updateWorkspaceAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug"),name=value(data,"name");if(!id||!slug||!name)return;await updateWorkspace(id,{name,description:value(data,"description"),links:links(value(data,"links")),details:{summary:value(data,"summary"),purpose:value(data,"purpose"),responsibilities:lines(value(data,"responsibilities")),workflow:lines(value(data,"workflow")),taskGuidance:value(data,"taskGuidance")}});revalidatePath("/workspaces");revalidatePath(`/workspaces/${slug}`);}
const refresh=(slug:string)=>revalidatePath(`/workspaces/${slug}`);
const postitColor=(data:FormData)=>["yellow","blue","pink","purple","green"].includes(value(data,"color"))?value(data,"color"):"yellow";
export async function createPostitAction(data:FormData){const workspaceId=value(data,"workspaceId"),slug=value(data,"slug"),content=value(data,"content");if(!workspaceId||!slug||!content)return;await createWorkspacePostit({workspaceId,title:value(data,"title"),content,color:postitColor(data)});refresh(slug);}
export async function updatePostitAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug"),content=value(data,"content");if(!id||!slug||!content)return;await updateWorkspacePostit(id,{title:value(data,"title"),content,color:postitColor(data)});refresh(slug);}
export async function deletePostitAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug");if(!id||!slug)return;await deleteWorkspacePostit(id);refresh(slug);}
export async function createTodoCategoryAction(data:FormData){const workspaceId=value(data,"workspaceId"),slug=value(data,"slug"),name=value(data,"name");if(!workspaceId||!slug||!name)return;await createWorkspaceTodoCategory(workspaceId,name);refresh(slug);}
export async function deleteTodoCategoryAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug");if(!id||!slug)return;await deleteWorkspaceTodoCategory(id);refresh(slug);}
export async function createTodoAction(data:FormData){const categoryId=value(data,"categoryId"),slug=value(data,"slug"),title=value(data,"title");if(!categoryId||!slug||!title)return;await createWorkspaceTodo(categoryId,title,value(data,"description"));refresh(slug);}
export async function toggleTodoAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug");if(!id||!slug)return;await updateWorkspaceTodoCompleted(id,value(data,"completed")==="true");refresh(slug);}
export async function deleteTodoAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug");if(!id||!slug)return;await deleteWorkspaceTodo(id);refresh(slug);}
