import {randomBytes} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {loadConfig} from '@/lib/config';
import {OAUTH_STATE_COOKIE,secureCookie,signToken} from '@/lib/session';
export async function GET(request:NextRequest){
  const config=loadConfig();const nonce=randomBytes(24).toString('base64url');
  const returnTo=request.nextUrl.searchParams.get('returnTo')==='/admin'?'/admin':config.webOrigin;
  const state=await signToken({nonce,returnTo},config.sessionSecret,'10m');
  const query=new URLSearchParams({client_id:config.googleClientId,redirect_uri:`${config.apiOrigin}/v1/auth/google/callback`,response_type:'code',scope:'openid email profile',state,nonce,prompt:'select_account'});
  const response=NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${query}`);
  response.cookies.set(OAUTH_STATE_COOKIE,state,secureCookie(600));return response;
}
