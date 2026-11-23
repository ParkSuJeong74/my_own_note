import {db} from '../database/db.js';
import {deviceHash,newDeviceRequest} from '../auth/device-auth.js';
import {randomBytes} from 'node:crypto';
export async function startDeviceRequest(platform:string){
  await db.query("DELETE FROM easyopen_device_requests WHERE expires_at<now()-interval '1 day'");
  await db.query("DELETE FROM easyopen_device_sessions WHERE expires_at<now()-interval '30 days'");
  const request=newDeviceRequest();
  const result=await db.query(`INSERT INTO easyopen_device_requests(device_hash,user_code_hash,platform,expires_at) SELECT $1,$2,$3,now()+interval '10 minutes' WHERE (SELECT count(*) FROM easyopen_device_requests WHERE expires_at>now() AND consumed_at IS NULL)<1000 RETURNING device_hash`,[request.deviceHash,request.userCodeHash,platform]);
  if(!result.rowCount)return null;
  return {deviceCode:request.deviceCode,userCode:request.userCode,expiresIn:600,interval:5,verificationUri:'https://easyopen-api.mano.io.kr/workspace/connect'};
}
export async function approveDeviceRequest(code:string,userId:string){
  const result=await db.query(`UPDATE easyopen_device_requests SET approved_user_id=$2 WHERE user_code_hash=$1 AND expires_at>now() AND consumed_at IS NULL AND approved_user_id IS NULL RETURNING platform`,[deviceHash(code),userId]);
  return Boolean(result.rowCount);
}
export async function exchangeDeviceCode(code:string){
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    const {rows}=await client.query(`SELECT *,expires_at<=now() AS expired,last_polled_at>now()-interval '5 seconds' AS too_fast FROM easyopen_device_requests WHERE device_hash=$1 FOR UPDATE`,[deviceHash(code)]);
    const row=rows[0];
    if(!row||row.expired||row.consumed_at){await client.query('ROLLBACK');return {error:'expired_or_used'} as const;}
    if(row.too_fast){await client.query('ROLLBACK');return {error:'slow_down'} as const;}
    await client.query('UPDATE easyopen_device_requests SET last_polled_at=now() WHERE device_hash=$1',[deviceHash(code)]);
    if(!row.approved_user_id){await client.query('COMMIT');return {error:'authorization_pending'} as const;}
    const token=randomBytes(32).toString('hex');
    await client.query(`INSERT INTO easyopen_device_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')`,[deviceHash(token),row.approved_user_id]);
    await client.query('UPDATE easyopen_device_requests SET consumed_at=now() WHERE device_hash=$1',[deviceHash(code)]);
    await client.query('COMMIT');
    return {token,expiresIn:604800} as const;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function deviceSession(token:string){
  const {rows}=await db.query(`SELECT u.id AS "userId",u.email FROM easyopen_device_sessions s JOIN easyopen_users u ON u.id=s.user_id WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`,[deviceHash(token)]);
  return rows[0] as {userId:string;email:string}|undefined;
}
export async function revokeDeviceSession(token:string){await db.query('UPDATE easyopen_device_sessions SET revoked_at=now() WHERE token_hash=$1',[deviceHash(token)]);}
