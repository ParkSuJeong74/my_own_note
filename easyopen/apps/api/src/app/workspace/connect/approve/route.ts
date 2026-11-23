import {NextRequest,NextResponse} from 'next/server';
import {loadConfig} from '@/lib/config';
import {currentSession} from '@/lib/request-auth';
import {approveDeviceRequest} from '@/lib/device-repository';
import {normalizeUserCode} from '@/lib/device-auth';
export async function POST(request:NextRequest){
  if(request.headers.get('origin')!==loadConfig().apiOrigin)return NextResponse.json({error:'invalid_origin'},{status:403});
  const session=await currentSession();
  if(!session)return NextResponse.json({error:'unauthorized'},{status:401});
  const code=normalizeUserCode((await request.formData()).get('userCode'));
  if(!code)return NextResponse.json({error:'invalid_code'},{status:400});
  try{
    if(!await approveDeviceRequest(code,session.userId))return NextResponse.json({error:'expired_or_used_code',message:'코드를 확인하거나 앱에서 새 연결을 시작하세요.'},{status:400});
    return new NextResponse('<!doctype html><html lang="ko"><meta charset="utf-8"><title>EasyOpen 연결 승인</title><h1>앱 연결을 승인했습니다.</h1><p>기기의 EasyOpen으로 돌아가 연결 완료를 확인하세요.</p><a href="/workspace">내 계정으로</a></html>',{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }catch{return NextResponse.json({error:'device_auth_unavailable'},{status:503});}
}
