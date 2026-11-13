import {cookies} from 'next/headers';
import {loadConfig} from './config';
import {SESSION_COOKIE,verifyToken} from './session';
export async function currentSession(){
  const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return null;
  try{const payload=await verifyToken(token,loadConfig().sessionSecret);return typeof payload.sub==='string'&&typeof payload.email==='string'?{userId:payload.sub,email:payload.email}:null;}catch{return null;}
}
export async function requireAdmin(){const session=await currentSession();if(!session||!loadConfig().adminEmails.has(session.email.toLowerCase()))return null;return session;}
