import {Injectable,Inject} from '@nestjs/common';
import {DataSource,IsNull} from 'typeorm';
import {UserEntity,EntitlementEntity,AuditEntity} from '../database/entities.js';
@Injectable()
export class AccountService{
 constructor(@Inject(DataSource) private readonly source:DataSource){}
 async upsertGoogleUser(input:{subject:string;email:string;name:string|null;picture:string|null}){
  const repo=this.source.getRepository(UserEntity);
  await repo.upsert({google_subject:input.subject,email:input.email.toLowerCase(),display_name:input.name,picture_url:input.picture,last_login_at:new Date()},['google_subject']);
  return repo.findOneByOrFail({google_subject:input.subject});
 }
 async listEntitlements(userId:string){return (await this.source.getRepository(EntitlementEntity).findBy({user_id:userId})).map(row=>({key:row.entitlement_key,startsAt:row.starts_at,endsAt:row.ends_at,revokedAt:row.revoked_at}));}
 async listUsers(){return this.source.getRepository(UserEntity).find({select:{id:true,email:true,display_name:true,created_at:true,last_login_at:true},order:{created_at:'DESC'},take:200});}
 async setAdminEntitlement(input:{actorUserId:string;userId:string;key:string;active:boolean;endsAt:Date|null}){
  await this.source.transaction(async manager=>{
   const repo=manager.getRepository(EntitlementEntity);
   const target={user_id:input.userId,entitlement_key:input.key,source_type:'admin',source_id:input.actorUserId};
   if(input.active)await repo.upsert({...target,starts_at:new Date(),ends_at:input.endsAt,revoked_at:null},['user_id','entitlement_key','source_type','source_id']);
   else await repo.update({user_id:input.userId,entitlement_key:input.key,source_type:'admin',revoked_at:IsNull()},{revoked_at:new Date()});
   await manager.getRepository(AuditEntity).save({actor_user_id:input.actorUserId,action:input.active?'entitlement.grant':'entitlement.revoke',target_type:'user_entitlement',target_id:input.userId,metadata:{entitlementKey:input.key,endsAt:input.endsAt?.toISOString()??null}});
  });
 }
}
