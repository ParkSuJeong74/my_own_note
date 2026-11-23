import {Controller,Get,Put,Req,Res,Param,Body,Inject} from '@nestjs/common';
import type {Request,Response} from 'express';
import {AuthService} from '../auth/auth.service.js';
import {AccountService} from './account.service.js';
import {activeEntitlements,isEntitlementKey} from '../auth/entitlements.js';
@Controller('v1')
export class AccountController{
 constructor(@Inject(AuthService) private readonly auth:AuthService,@Inject(AccountService) private readonly accounts:AccountService){}
 @Get('me') async me(@Req() request:Request,@Res() response:Response){const session=await this.auth.session(request);return response.json({session,admin:Boolean(session&&this.auth.config.adminEmails.has(session.email.toLowerCase()))});}
 @Get('me/entitlements') async entitlements(@Req() request:Request,@Res() response:Response){const session=await this.auth.session(request);if(!session)return response.status(401).json({error:'unauthorized'});return response.json({entitlements:activeEntitlements(await this.accounts.listEntitlements(session.userId))});}
 @Get('admin/users') async users(@Req() request:Request,@Res() response:Response){if(!await this.auth.admin(request))return response.status(403).json({error:'forbidden'});return response.json({users:await this.accounts.listUsers()});}
 @Put('admin/users/:id/entitlements/:key') async setEntitlement(@Req() request:Request,@Res() response:Response,@Param('id') id:string,@Param('key') key:string,@Body() body:unknown){
  const admin=await this.auth.admin(request);if(!admin)return response.status(403).json({error:'forbidden'});
  if(!this.auth.sameOrigin(request))return response.status(403).json({error:'invalid_origin'});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!isEntitlementKey(key))return response.status(400).json({error:'invalid_target'});
  const value=body as {active?:unknown;endsAt?:unknown}|null;
  if(typeof value?.active!=='boolean')return response.status(400).json({error:'active_boolean_required'});
  let endsAt:Date|null=null;if(value.endsAt!==undefined&&value.endsAt!==null){if(typeof value.endsAt!=='string'||Number.isNaN(Date.parse(value.endsAt)))return response.status(400).json({error:'invalid_ends_at'});endsAt=new Date(value.endsAt);}
  await this.accounts.setAdminEntitlement({actorUserId:admin.userId,userId:id,key,active:value.active,endsAt});return response.json({ok:true});
 }
}
