import type {ContainerAppSpec} from './container-installer';

export type ContainerUpdateResult={ok:boolean;message:string};
export type RemoveManagedContainer=(name:string)=>Promise<ContainerUpdateResult>;
export type InstallApprovedContainer=(spec:ContainerAppSpec)=>Promise<ContainerUpdateResult>;

export async function replaceContainerImage(input:{
  previous:ContainerAppSpec;
  next:ContainerAppSpec;
  remove:RemoveManagedContainer;
  install:InstallApprovedContainer;
  log?:(message:string)=>void;
}):Promise<ContainerUpdateResult>{
  if(input.previous.containerName!==input.next.containerName)throw new Error('업데이트 대상 컨테이너 이름이 일치하지 않습니다.');
  if(input.previous.image===input.next.image)return {ok:true,message:'이미 최신 CosyVoice 이미지입니다.'};
  const removed=await input.remove(input.previous.containerName);
  if(!removed.ok)return removed;
  const updated=await input.install(input.next);
  if(updated.ok)return {ok:true,message:'CosyVoice 이미지 업데이트와 health check를 완료했습니다. 모델 데이터는 보존했습니다.'};
  input.log?.('새 이미지 준비에 실패해 이전 CosyVoice digest 복구를 시도합니다.');
  const restored=await input.install(input.previous);
  return {ok:false,message:restored.ok?`${updated.message} 이전 CosyVoice 이미지로 복구했습니다.`:`${updated.message} 이전 이미지 복구도 실패했습니다. Runtime 로그를 확인하세요.`};
}

