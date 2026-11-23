import {Controller,Get,Post,Req,Res,Inject} from '@nestjs/common';
import type {Request,Response} from 'express';
import {randomBytes} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {AuthService} from './auth.service.js';
import {AccountService} from '../accounts/account.service.js';
import {authReturnPath} from './auth-destination.js';
import {validateOAuthState} from './oauth-state.js';
import {OAUTH_STATE_COOKIE,SESSION_COOKIE,secureCookie,signToken} from './session.js';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const cookie=(seconds:number)=>({...secureCookie(seconds),maxAge:seconds*1000});
@Controller()
export class AuthController{
 constructor(@Inject(AuthService) private readonly auth:AuthService,@Inject(AccountService) private readonly accounts:AccountService){}
 @Get('v1/auth/google/start') async start(@Req() request:Request,@Res() response:Response){
  const config=this.auth.config,nonce=randomBytes(24).toString('base64url');
  const returnTo=authReturnPath(request.query.returnTo)??config.webOrigin;
  const state=await signToken({nonce,returnTo},config.sessionSecret,'10m');
  const query=new URLSearchParams({client_id:config.googleClientId,redirect_uri:config.apiOrigin+'/v1/auth/google/callback',response_type:'code',scope:'openid email profile',state,nonce,prompt:'select_account'});
  response.cookie(OAUTH_STATE_COOKIE,state,cookie(600)).redirect(307,'https://accounts.google.com/o/oauth2/v2/auth?'+query);
 }
 @Get('v1/auth/google/callback') async callback(@Req() request:Request,@Res() response:Response){
  const config=this.auth.config;
  const fail=(error:string,status:number)=>response.clearCookie(OAUTH_STATE_COOKIE,cookie(0)).status(status).json({error});
  const state=typeof request.query.state==='string'?request.query.state:null;
  const statePayload=await validateOAuthState(state,request.cookies?.[OAUTH_STATE_COOKIE],config.sessionSecret);
  if(!statePayload)return fail('invalid_oauth_state',400);
  if('error' in request.query)return fail('google_authorization_denied',400);
  const code=typeof request.query.code==='string'?request.query.code:null;
  if(!code)return fail('missing_oauth_code',400);
  try{
   const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:config.googleClientId,client_secret:config.googleClientSecret,redirect_uri:config.apiOrigin+'/v1/auth/google/callback',grant_type:'authorization_code'}),cache:'no-store',signal:AbortSignal.timeout(10000)});
   const tokens=await tokenResponse.json() as {id_token?:string};if(!tokenResponse.ok||!tokens.id_token)return fail('google_token_exchange_failed',502);
   let payload;try{({payload}=await jwtVerify(tokens.id_token,googleKeys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.googleClientId}));}catch{return fail('invalid_google_identity',403);}
   if(payload.nonce!==statePayload.nonce||typeof payload.sub!=='string'||typeof payload.email!=='string'||payload.email_verified!==true)return fail('invalid_google_identity',403);
   const user=await this.accounts.upsertGoogleUser({subject:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:null,picture:typeof payload.picture==='string'?payload.picture:null});
   const session=await signToken({sub:user.id,email:user.email},config.sessionSecret,'7d');
   const path=authReturnPath(statePayload.returnTo);
   response.cookie(SESSION_COOKIE,session,cookie(604800)).clearCookie(OAUTH_STATE_COOKIE,cookie(0)).redirect(307,path?new URL(path,config.apiOrigin).toString():config.webOrigin);
  }catch{return fail('oauth_signin_unavailable',502);}
 }
 @Post(['v1/auth/logout','workspace/logout','admin/logout']) logout(@Req() request:Request,@Res() response:Response){
  if(!this.auth.sameOrigin(request))return response.status(403).json({error:'invalid_origin'});
  response.clearCookie(SESSION_COOKIE,cookie(0));
  if(request.path==='/v1/auth/logout')return response.status(200).json({ok:true});
  return response.redirect(303,this.auth.config.apiOrigin+(request.path==='/admin/logout'?'/admin':'/workspace'));
 }
}
