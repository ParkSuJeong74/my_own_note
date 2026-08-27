"use client";

import { useState } from "react";
import { createEventAction } from "@/app/personal/actions";
import { EventColorPicker } from "@/components/event-color-picker";
import { EventScheduleFields } from "@/components/event-schedule-fields";

type WorkspaceOption={id:string;name:string};
export function EventCreateModal({date,workspaces}:{date:string;workspaces:WorkspaceOption[]}){
  const [open,setOpen]=useState(false);
  async function submit(data:FormData){await createEventAction(data);setOpen(false);}
  return <><button type="button" className="day-add" onClick={()=>setOpen(true)} aria-label={`Add event on ${date}`}>+</button>{open&&<div className="modal-backdrop" onMouseDown={()=>setOpen(false)}><div className="event-modal" role="dialog" aria-modal="true" aria-label="Create calendar event" onMouseDown={(event)=>event.stopPropagation()}><div className="section-heading"><div><p className="eyebrow">NEW EVENT</p><h2>{date}</h2></div><button type="button" className="modal-close" onClick={()=>setOpen(false)}>×</button></div><form action={submit}><label><span>Title</span><input name="title" required autoFocus placeholder="Event title"/></label><label><span>Workspace</span><select name="workspaceId"><option value="">No workspace</option>{workspaces.map((workspace)=><option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label><EventScheduleFields initialStart={`${date}T09:00`} initialEnd={`${date}T10:00`}/><label><span>Repeat</span><select name="recurrence" defaultValue="NONE"><option value="NONE">Does not repeat</option><option value="YEARLY">Every year</option></select></label><EventColorPicker/><label><span>Description</span><textarea name="description" placeholder="Optional details"/></label><div className="editor-actions"><button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancel</button><button>Create event</button></div></form></div></div>}</>;
}
