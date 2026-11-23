import {SignJWT,jwtVerify} from 'jose';
export const SESSION_COOKIE='easyopen_session';
export const OAUTH_STATE_COOKIE='easyopen_oauth_state';
const key=(secret:string)=>new TextEncoder().encode(secret);

export async function signToken(payload:Record<string,unknown>,secret:string,expiresIn:string){
  return new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(expiresIn).setIssuer('easyopen-account-api').setAudience('easyopen').sign(key(secret));
}
export async function verifyToken(token:string,secret:string){
  return (await jwtVerify(token,key(secret),{issuer:'easyopen-account-api',audience:'easyopen'})).payload;
}
export const secureCookie=(maxAge:number)=>({httpOnly:true,secure:true,sameSite:'lax' as const,path:'/',maxAge});
