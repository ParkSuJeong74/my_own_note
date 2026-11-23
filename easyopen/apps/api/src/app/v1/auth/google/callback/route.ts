import {validateOAuthState} from '@/lib/oauth-state';
import {authReturnPath} from '@/lib/auth-destination';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {NextRequest,NextResponse} from 'next/server';
import {loadConfig} from '@/lib/config';
import {upsertGoogleUser} from '@/lib/repository';
import {OAUTH_STATE_COOKIE,SESSION_COOKIE,secureCookie,signToken} from '@/lib/session';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export async function GET(request:NextRequest){
  const config=loadConfig(),code=request.nextUrl.searchParams.get('code'),state=request.nextUrl.searchParams.get('state'),saved=request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const failure=(error:string,status:number)=>{const response=NextResponse.json({error},{status});response.cookies.delete(OAUTH_STATE_COOKIE);return response;};
  const statePayload=await validateOAuthState(state,saved,config.sessionSecret);
  if(!statePayload)return failure('invalid_oauth_state',400);
  if(request.nextUrl.searchParams.has('error'))return failure('google_authorization_denied',400);
  if(!code)return failure('missing_oauth_code',400);
  try{
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.googleClientId,client_secret:config.googleClientSecret,redirect_uri:`${config.apiOrigin}/v1/auth/google/callback`,grant_type:'authorization_code'}),cache:'no-store'});
    const tokens=await tokenResponse.json() as {id_token?:string};if(!tokenResponse.ok||!tokens.id_token)return failure('google_token_exchange_failed',502);
    let payload;
    try{({payload}=await jwtVerify(tokens.id_token,googleKeys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.googleClientId}));}
    catch{return failure('invalid_google_identity',403);}
    if(payload.nonce!==statePayload.nonce||typeof payload.sub!=='string'||typeof payload.email!=='string'||payload.email_verified!==true)return failure('invalid_google_identity',403);
    const user=await upsertGoogleUser({subject:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:null,picture:typeof payload.picture==='string'?payload.picture:null});
    const session=await signToken({sub:user.id,email:user.email},config.sessionSecret,'7d');
    const returnPath=authReturnPath(statePayload.returnTo);
    const destination=returnPath?new URL(returnPath,config.apiOrigin).toString():config.webOrigin;
    const response=NextResponse.redirect(destination);
    response.cookies.set(SESSION_COOKIE,session,secureCookie(604800));response.cookies.delete(OAUTH_STATE_COOKIE);return response;
  }catch{return failure('oauth_signin_unavailable',502);}
}
