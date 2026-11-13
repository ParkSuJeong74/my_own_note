import {NextRequest,NextResponse} from 'next/server';
import {isEntitlementKey} from '@/lib/entitlements';
import {requireAdmin} from '@/lib/request-auth';
import {setAdminEntitlement} from '@/lib/repository';

export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string;key:string}>}){
  const admin=await requireAdmin();if(!admin)return NextResponse.json({error:'forbidden'},{status:403});
  const {id,key}=await params;if(!/^[0-9a-f-]{36}$/i.test(id)||!isEntitlementKey(key))return NextResponse.json({error:'invalid_target'},{status:400});
  const body=await request.json().catch(()=>null) as {active?:unknown;endsAt?:unknown}|null;
  if(typeof body?.active!=='boolean')return NextResponse.json({error:'active_boolean_required'},{status:400});
  let endsAt:Date|null=null;
  if(body.endsAt!==undefined&&body.endsAt!==null){if(typeof body.endsAt!=='string'||Number.isNaN(Date.parse(body.endsAt)))return NextResponse.json({error:'invalid_ends_at'},{status:400});endsAt=new Date(body.endsAt);}
  await setAdminEntitlement({actorUserId:admin.userId,userId:id,key,active:body.active,endsAt});
  return NextResponse.json({ok:true});
}
