import {NextResponse} from "next/server";
import {listN8nRunnableTasks,n8nAuthorized} from "@/lib/n8n-integration";
export async function GET(request:Request){if(!n8nAuthorized(request))return NextResponse.json({error:"unauthorized"},{status:401});return NextResponse.json({tasks:await listN8nRunnableTasks()});}
