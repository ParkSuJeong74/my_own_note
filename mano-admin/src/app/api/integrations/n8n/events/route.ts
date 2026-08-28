import {NextResponse} from "next/server";
import {listAutomationEvents,n8nAuthorized} from "@/lib/n8n-integration";
export async function GET(request:Request){if(!n8nAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401});const url=new URL(request.url),after=Number(url.searchParams.get("after")??0),limit=Number(url.searchParams.get("limit")??100);return NextResponse.json({events:await listAutomationEvents(Number.isSafeInteger(after)?after:0,Number.isSafeInteger(limit)?limit:100)});}
