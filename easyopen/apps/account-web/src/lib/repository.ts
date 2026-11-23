import {backendRequest} from './backend';
export async function listUsers(){return (await backendRequest('/v1/admin/users')).users;}
export async function listEntitlements(_userId:string){
 const result=await backendRequest('/v1/me/entitlements');
 return (result.entitlements as string[]).map(key=>({key,startsAt:new Date(0),endsAt:null,revokedAt:null}));
}
