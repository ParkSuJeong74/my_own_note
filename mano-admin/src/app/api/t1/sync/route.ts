import {NextResponse} from "next/server";
import {n8nAuthorized} from "@/lib/n8n-integration";
import {syncT1FromLeaguepedia} from "@/lib/t1-repository";
import {ExternalProviderError} from "@/lib/external-http";
import {recordAdminError} from "@/lib/admin-errors";

export const dynamic="force-dynamic";

export async function POST(request:Request){
  if(!n8nAuthorized(request))return NextResponse.json({error:"Unauthorized"},{status:401});
  try{return NextResponse.json({ok:true,...await syncT1FromLeaguepedia()});}
  catch(error){
    if(error instanceof ExternalProviderError){
      await recordAdminError("t1-sync-provider",error,{provider:error.provider,operation:error.operation,httpStatus:error.status,attempts:error.attempts,retryAfterMs:error.retryAfterMs});
      return NextResponse.json({ok:false,error:"External provider request failed",provider:error.provider,operation:error.operation,providerStatus:error.status,attempts:error.attempts,retryable:error.retryable},{status:error.status===429?429:502,headers:error.retryAfterMs?{"Retry-After":String(Math.max(1,Math.ceil(error.retryAfterMs/1000)))}:undefined});
    }
    await recordAdminError("t1-sync",error);
    return NextResponse.json({ok:false,error:"T1 sync failed"},{status:502});
  }
}
