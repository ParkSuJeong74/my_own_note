import {createRemoteJWKSet,jwtVerify} from 'jose';
import {NextRequest,NextResponse} from 'next/server';
import {loadConfig} from '@/lib/config';
import {upsertGoogleUser} from '@/lib/repository';
import {OAUTH_STATE_COOKIE,SESSION_COOKIE,secureCookie,signToken,verifyToken} from '@/lib/session';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export async function GET(request:NextRequest){
  const config=loadConfig(),code=request.nextUrl.searchParams.get('code'),state=request.nextUrl.searchParams.get('state'),saved=request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if(!code||!state||state!==saved)return NextResponse.json({error:'invalid_oauth_state'},{status:400});
  const statePayload=await verifyToken(state,config.sessionSecret);
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.googleClientId,client_secret:config.googleClientSecret,redirect_uri:`${config.apiOrigin}/v1/auth/google/callback`,grant_type:'authorization_code'}),cache:'no-store'});
  const tokens=await tokenResponse.json() as {id_token?:string};if(!tokenResponse.ok||!tokens.id_token)return NextResponse.json({error:'google_token_exchange_failed'},{status:502});
  const {payload}=await jwtVerify(tokens.id_token,googleKeys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.googleClientId});
  if(payload.nonce!==statePayload.nonce||typeof payload.sub!=='string'||typeof payload.email!=='string'||payload.email_verified!==true)return NextResponse.json({error:'invalid_google_identity'},{status:403});
  const user=await upsertGoogleUser({subject:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:null,picture:typeof payload.picture==='string'?payload.picture:null});
  const session=await signToken({sub:user.id,email:user.email},config.sessionSecret,'7d');
  const destination=statePayload.returnTo==='/admin'?`${config.adminOrigin}/admin`:config.webOrigin;
  const response=NextResponse.redirect(destination);
  response.cookies.set(SESSION_COOKIE,session,secureCookie(604800));response.cookies.delete(OAUTH_STATE_COOKIE);return response;
}
