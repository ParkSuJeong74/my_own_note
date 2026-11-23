import {Controller,Post,Req,Res,Inject} from '@nestjs/common';
import type {Request,Response} from 'express';
import {AuthService} from '../auth/auth.service.js';
@Controller('v1/billing')
export class BillingController{
 constructor(@Inject(AuthService) private readonly auth:AuthService){}
 @Post('checkout-sessions') async checkout(@Req() request:Request,@Res() response:Response){
  if(!await this.auth.session(request))return response.status(401).json({error:'unauthorized'});
  if(!this.auth.sameOrigin(request))return response.status(403).json({error:'invalid_origin'});
  const provider=this.auth.config.billingProvider;
  return response.status(provider?501:503).json(provider?{error:'billing_provider_not_implemented',provider}:{error:'billing_provider_not_configured'});
 }
}
