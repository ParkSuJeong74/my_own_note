import {Inject,Injectable} from '@nestjs/common';
import type {Request} from 'express';
import {loadConfig} from './config.js';
import {SESSION_COOKIE,verifyToken} from './session.js';
@Injectable()
export class AuthService{
 readonly config=loadConfig();
 async session(request:Request){
  const token=request.cookies?.[SESSION_COOKIE];if(typeof token!=='string')return null;
  try{const payload=await verifyToken(token,this.config.sessionSecret);return typeof payload.sub==='string'&&typeof payload.email==='string'?{userId:payload.sub,email:payload.email}:null;}catch{return null;}
 }
 async admin(request:Request){const session=await this.session(request);return session&&this.config.adminEmails.has(session.email.toLowerCase())?session:null;}
 sameOrigin(request:Request){return request.headers.origin===this.config.apiOrigin;}
}
