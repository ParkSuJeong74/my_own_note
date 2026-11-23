import {cookies} from 'next/headers';
export function backendOrigin(env:NodeJS.ProcessEnv=process.env){
 const value=env.EASYOPEN_BACKEND_ORIGIN||'http://127.0.0.1:3001';
 const url=new URL(value);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Invalid internal backend origin');
 return url.origin;
}
export async function backendRequest(path:string){
 const response=await fetch(backendOrigin()+path,{headers:{cookie:(await cookies()).toString()},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error('Account service is unavailable');
 return response.json();
}
