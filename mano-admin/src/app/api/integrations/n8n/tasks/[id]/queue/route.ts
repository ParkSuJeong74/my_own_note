import {NextResponse} from "next/server";
import {enqueueTask} from "@/lib/automation-control";
import {emitAutomationEvent,n8nAuthorized} from "@/lib/n8n-integration";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){if(!n8nAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401});const {id}=await params;const executionIds=await enqueueTask(id);if(executionIds.length)await emitAutomationEvent("task.queued",{taskId:id,executionIds,executionCount:executionIds.length,source:"n8n"});return executionIds.length?NextResponse.json({taskId:id,executionIds},{status:201}):NextResponse.json({error:"task unavailable or already queued"},{status:409});}
