"use server";

import { revalidatePath } from "next/cache";
import { updateWorkspace } from "@/lib/automation-repository";

const value=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const lines=(input:string)=>input.split("\n").map((line)=>line.trim()).filter(Boolean);
function links(input:string){return lines(input).flatMap((line)=>{const separator=line.indexOf("|");if(separator<1)return[];const label=line.slice(0,separator).trim(),url=line.slice(separator+1).trim();try{const parsed=new URL(url);return label&&["http:","https:"].includes(parsed.protocol)?[{label,url}]:[];}catch{return[];}});}

export async function updateWorkspaceAction(data:FormData){const id=value(data,"id"),slug=value(data,"slug"),name=value(data,"name");if(!id||!slug||!name)return;await updateWorkspace(id,{name,description:value(data,"description"),links:links(value(data,"links")),details:{summary:value(data,"summary"),purpose:value(data,"purpose"),responsibilities:lines(value(data,"responsibilities")),workflow:lines(value(data,"workflow")),taskGuidance:value(data,"taskGuidance")}});revalidatePath("/workspaces");revalidatePath(`/workspaces/${slug}`);}
