"use server";

import { revalidatePath } from "next/cache";
import { createGlobalTodo, deleteGlobalTodo, updateGlobalTodo } from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const refresh=()=>revalidatePath("/");
export async function createGlobalTodoAction(data:FormData){const title=value(data,"title");if(!title)return;await createGlobalTodo(title);refresh();}
export async function updateGlobalTodoAction(data:FormData){const id=value(data,"id"),title=value(data,"title");if(!id||!title)return;await updateGlobalTodo(id,{title});refresh();}
export async function toggleGlobalTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await updateGlobalTodo(id,{completed:value(data,"completed")==="true"});refresh();}
export async function deleteGlobalTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteGlobalTodo(id);refresh();}
