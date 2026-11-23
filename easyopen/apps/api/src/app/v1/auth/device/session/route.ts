import {NextRequest,NextResponse} from 'next/server';
import {deviceSession,revokeDeviceSession} from '@/lib/device-repository';
import {validDeviceToken} from '@/lib/device-auth';
import {listEntitlements} from '@/lib/repository';
import {activeEntitlements} from '@/lib/entitlements';
const tokenFrom=(request:NextRequest)=>request.headers.get('authorization')?.replace(/^Bearer /,'')??'';
export async function GET(request:NextRequest){
  const token=tokenFrom(request);
  if(!validDeviceToken(token))return NextResponse.json({error:'unauthorized'},{status:401});
  try{
    const session=await deviceSession(token);
    if(!session)return NextResponse.json({error:'unauthorized'},{status:401,headers:{'cache-control':'no-store'}});
    return NextResponse.json({email:session.email,entitlements:activeEntitlements(await listEntitlements(session.userId))},{headers:{'cache-control':'no-store'}});
  }catch{return NextResponse.json({error:'account_unavailable'},{status:503});}
}
export async function DELETE(request:NextRequest){
  const token=tokenFrom(request);
  if(!validDeviceToken(token))return NextResponse.json({error:'unauthorized'},{status:401});
  try{await revokeDeviceSession(token);return NextResponse.json({ok:true},{headers:{'cache-control':'no-store'}});}
  catch{return NextResponse.json({error:'account_unavailable'},{status:503});}
}
