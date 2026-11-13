import {db} from './db';
export async function upsertGoogleUser(input:{subject:string;email:string;name:string|null;picture:string|null}){
  const {rows}=await db.query(`INSERT INTO easyopen_users(google_subject,email,display_name,picture_url,last_login_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(google_subject) DO UPDATE SET email=excluded.email,display_name=excluded.display_name,picture_url=excluded.picture_url,last_login_at=now(),updated_at=now() RETURNING id,email,display_name,picture_url`,[input.subject,input.email.toLowerCase(),input.name,input.picture]);
  return rows[0] as {id:string;email:string;display_name:string|null;picture_url:string|null};
}
export async function listEntitlements(userId:string){
  const {rows}=await db.query(`SELECT entitlement_key AS key,starts_at AS "startsAt",ends_at AS "endsAt",revoked_at AS "revokedAt" FROM easyopen_entitlements WHERE user_id=$1`,[userId]);
  return rows as {key:string;startsAt:Date;endsAt:Date|null;revokedAt:Date|null}[];
}
export async function listUsers(){const {rows}=await db.query(`SELECT id,email,display_name,created_at,last_login_at FROM easyopen_users ORDER BY created_at DESC LIMIT 200`);return rows;}
export async function setAdminEntitlement(input:{actorUserId:string;userId:string;key:string;active:boolean;endsAt:Date|null}){
  const client=await db.connect();
  try{
    await client.query('BEGIN');
    if(input.active){
      await client.query(`INSERT INTO easyopen_entitlements(user_id,entitlement_key,source_type,source_id,starts_at,ends_at,revoked_at) VALUES($1,$2,'admin',$3,now(),$4,NULL) ON CONFLICT(user_id,entitlement_key,source_type,source_id) DO UPDATE SET starts_at=now(),ends_at=excluded.ends_at,revoked_at=NULL`,[input.userId,input.key,input.actorUserId,input.endsAt]);
    }else{
      await client.query(`UPDATE easyopen_entitlements SET revoked_at=now() WHERE user_id=$1 AND entitlement_key=$2 AND source_type='admin' AND revoked_at IS NULL`,[input.userId,input.key]);
    }
    await client.query(`INSERT INTO easyopen_audit_events(actor_user_id,action,target_type,target_id,metadata) VALUES($1,$2,'user_entitlement',$3,$4::jsonb)`,[input.actorUserId,input.active?'entitlement.grant':'entitlement.revoke',input.userId,JSON.stringify({entitlementKey:input.key,endsAt:input.endsAt?.toISOString()??null})]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
