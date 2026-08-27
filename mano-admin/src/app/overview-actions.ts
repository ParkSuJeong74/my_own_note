"use server";

import { revalidatePath } from "next/cache";
import { createDailyTodo, createGlobalTodo, createMonthlyTodo, deleteDailyTodo, deleteGlobalTodo, deleteMonthlyTodo, setDailyTodoCompleted, setMonthlyTodoCompleted, updateDailyTodo, updateGlobalTodo, updateMonthlyTodo } from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const refresh=()=>revalidatePath("/");
export async function createGlobalTodoAction(data:FormData){const title=value(data,"title");if(!title)return;await createGlobalTodo(title);refresh();}
export async function updateGlobalTodoAction(data:FormData){const id=value(data,"id"),title=value(data,"title");if(!id||!title)return;await updateGlobalTodo(id,{title});refresh();}
export async function toggleGlobalTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await updateGlobalTodo(id,{completed:value(data,"completed")==="true"});refresh();}
export async function deleteGlobalTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteGlobalTodo(id);refresh();}
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export async function createDailyTodoAction(data:FormData){const title=value(data,"title");if(!title)return;await createDailyTodo(title);refresh();}
export async function updateDailyTodoAction(data:FormData){const id=value(data,"id"),title=value(data,"title");if(!id||!title)return;await updateDailyTodo(id,title);refresh();}
export async function toggleDailyTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await setDailyTodoCompleted(id,today(),value(data,"completed")==="true");refresh();}
export async function deleteDailyTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteDailyTodo(id);refresh();}
const currentMonth=()=>today().slice(0,7);
export async function createMonthlyTodoAction(data:FormData){const title=value(data,"title");if(!title)return;await createMonthlyTodo(title);refresh();}
export async function updateMonthlyTodoAction(data:FormData){const id=value(data,"id"),title=value(data,"title");if(!id||!title)return;await updateMonthlyTodo(id,title);refresh();}
export async function toggleMonthlyTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await setMonthlyTodoCompleted(id,currentMonth(),value(data,"completed")==="true");refresh();}
export async function deleteMonthlyTodoAction(data:FormData){const id=value(data,"id");if(!id)return;await deleteMonthlyTodo(id);refresh();}
