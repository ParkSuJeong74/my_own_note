import {backendRequest} from './backend';
type Session={userId:string;email:string};
export async function currentSession():Promise<Session|null>{return (await backendRequest('/v1/me')).session;}
export async function requireAdmin():Promise<Session|null>{const result=await backendRequest('/v1/me');return result.admin?result.session:null;}
