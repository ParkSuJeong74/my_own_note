import {NextRequest,NextResponse} from 'next/server';
import {loadConfig} from '@/lib/config';
import {SESSION_COOKIE} from '@/lib/session';
export async function POST(request:NextRequest){
  if(request.headers.get('origin')!==loadConfig().apiOrigin)return NextResponse.json({error:'invalid_origin'},{status:403});
  const response=NextResponse.json({ok:true});response.cookies.delete(SESSION_COOKIE);return response;
}
