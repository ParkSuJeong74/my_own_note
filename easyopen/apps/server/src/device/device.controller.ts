import {Controller,Get,Post,Delete,Req,Res,Body,Inject} from '@nestjs/common';
import type {Request,Response} from 'express';
import {AuthService} from '../auth/auth.service.js';
import {AccountService} from '../accounts/account.service.js';
import {activeEntitlements} from '../auth/entitlements.js';
import {normalizeUserCode,validDeviceToken} from '../auth/device-auth.js';
import {startDeviceRequest,approveDeviceRequest,exchangeDeviceCode,deviceSession,revokeDeviceSession} from './device-repository.js';
@Controller()
export class DeviceController{
 constructor(@Inject(AuthService) private readonly auth:AuthService,@Inject(AccountService) private readonly accounts:AccountService){}
 @Post('v1/auth/device/start') async start(@Body() body:{platform?:unknown}|null,@Res() response:Response){
  if(typeof body?.platform!=='string'||!['desktop','android','ios'].includes(body.platform))return response.status(400).json({error:'invalid_platform'});
  try{const result=await startDeviceRequest(body.platform);return response.status(result?200:429).json(result??{error:'temporarily_unavailable'});}catch{return response.status(503).json({error:'device_auth_unavailable'});}
 }
 @Post('v1/auth/device/exchange') async exchange(@Body() body:{deviceCode?:unknown}|null,@Res() response:Response){
  if(!validDeviceToken(body?.deviceCode))return response.status(400).json({error:'invalid_device_code'});
  try{const result=await exchangeDeviceCode(body.deviceCode);return response.status('token' in result?200:result.error==='slow_down'?429:400).json(result);}catch{return response.status(503).json({error:'device_auth_unavailable'});}
 }
 @Post('workspace/connect/approve') async approve(@Req() request:Request,@Res() response:Response,@Body() body:{userCode?:unknown}|null){
  if(!this.auth.sameOrigin(request))return response.status(403).json({error:'invalid_origin'});
  const session=await this.auth.session(request);if(!session)return response.status(401).json({error:'unauthorized'});
  const code=normalizeUserCode(body?.userCode);if(!code)return response.status(400).json({error:'invalid_code'});
  try{if(!await approveDeviceRequest(code,session.userId))return response.status(400).json({error:'expired_or_used_code',message:'코드를 확인하거나 앱에서 새 연결을 시작하세요.'});return response.status(200).type('html').send('<!doctype html><html lang="ko"><meta charset="utf-8"><title>EasyOpen 연결 승인</title><h1>앱 연결을 승인했습니다.</h1><p>기기의 EasyOpen으로 돌아가 연결 완료를 확인하세요.</p><a href="/workspace">내 계정으로</a></html>');}catch{return response.status(503).json({error:'device_auth_unavailable'});}
 }
 @Get('v1/auth/device/session') async session(@Req() request:Request,@Res() response:Response){
  const token=request.headers.authorization?.replace(/^Bearer /,'')??'';if(!validDeviceToken(token))return response.status(401).json({error:'unauthorized'});
  try{const session=await deviceSession(token);if(!session)return response.status(401).json({error:'unauthorized'});return response.json({email:session.email,entitlements:activeEntitlements(await this.accounts.listEntitlements(session.userId))});}catch{return response.status(503).json({error:'account_unavailable'});}
 }
 @Delete('v1/auth/device/session') async logout(@Req() request:Request,@Res() response:Response){
  const token=request.headers.authorization?.replace(/^Bearer /,'')??'';if(!validDeviceToken(token))return response.status(401).json({error:'unauthorized'});
  try{await revokeDeviceSession(token);return response.json({ok:true});}catch{return response.status(503).json({error:'account_unavailable'});}
 }
}
