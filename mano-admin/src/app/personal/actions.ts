"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCalendarEvent, createNote, deleteCalendarEvent, deleteNote, updateCalendarEvent, updateNote } from "@/lib/automation-repository";

const text=(data:FormData,name:string)=>String(data.get(name)??"").trim();
const workspace=(data:FormData)=>text(data,"workspaceId")||null;
const tags=(value:string)=>[...new Set(value.split(",").map((v)=>v.trim()).filter(Boolean))].slice(0,20);

export async function createNoteAction(data:FormData){const title=text(data,"title");if(!title)return;const id=await createNote({workspaceId:workspace(data),title,body:text(data,"body"),tags:tags(text(data,"tags"))});revalidatePath("/notes");redirect(`/notes/${id}`);}
export async function updateNoteAction(data:FormData){const id=text(data,"id"),title=text(data,"title");if(!id||!title)return;await updateNote(id,{workspaceId:workspace(data),title,body:text(data,"body"),tags:tags(text(data,"tags")),isPinned:data.get("isPinned")==="on"});revalidatePath("/notes");revalidatePath(`/notes/${id}`);}
export async function deleteNoteAction(data:FormData){const id=text(data,"id");if(!id)return;await deleteNote(id);revalidatePath("/notes");redirect("/notes");}

function dateValue(raw:string,allDay:boolean){if(!raw)return null;const date=new Date(allDay?`${raw.slice(0,10)}T00:00:00+09:00`:raw);return Number.isNaN(date.valueOf())?null:date.toISOString();}
export async function createEventAction(data:FormData){const title=text(data,"title"),allDay=data.get("allDay")==="on";const startsAt=dateValue(text(data,"startsAt"),allDay);const endsAt=dateValue(text(data,"endsAt"),allDay);if(!title||!startsAt||endsAt&&endsAt<startsAt)return;await createCalendarEvent({workspaceId:workspace(data),title,description:text(data,"description"),startsAt,endsAt,allDay});revalidatePath("/calendar");revalidatePath("/");}
export async function updateEventAction(data:FormData){const id=text(data,"id"),title=text(data,"title"),allDay=data.get("allDay")==="on";const startsAt=dateValue(text(data,"startsAt"),allDay),endsAt=dateValue(text(data,"endsAt"),allDay);if(!id||!title||!startsAt||endsAt&&endsAt<startsAt)return;await updateCalendarEvent(id,{workspaceId:workspace(data),title,description:text(data,"description"),startsAt,endsAt,allDay});revalidatePath("/calendar");revalidatePath(`/calendar/events/${id}`);revalidatePath("/");}
export async function deleteEventAction(data:FormData){const id=text(data,"id");if(!id)return;await deleteCalendarEvent(id);revalidatePath("/calendar");revalidatePath("/");redirect("/calendar");}
