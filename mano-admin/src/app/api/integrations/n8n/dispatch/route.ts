import {NextResponse} from "next/server";
import {deliverPendingAutomationEvents,n8nAuthorized} from "@/lib/n8n-integration";
export async function POST(request:Request){if(!n8nAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401});return NextResponse.json(await deliverPendingAutomationEvents());}
