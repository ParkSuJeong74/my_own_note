import {NextRequest,NextResponse} from 'next/server';
import {SESSION_COOKIE} from '@/lib/session';

export async function POST(request:NextRequest){
  const response=NextResponse.redirect(new URL('/admin',request.url),303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
