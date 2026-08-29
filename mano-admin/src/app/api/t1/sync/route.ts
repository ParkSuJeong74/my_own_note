import {NextResponse} from "next/server";
import {n8nAuthorized} from "@/lib/n8n-integration";
import {syncT1FromLeaguepedia} from "@/lib/t1-repository";

export const dynamic="force-dynamic";

export async function POST(request:Request){
  if(!n8nAuthorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});
  try{return NextResponse.json({ok:true,...await syncT1FromLeaguepedia()});}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"T1 sync failed"},{status:502});}
}
