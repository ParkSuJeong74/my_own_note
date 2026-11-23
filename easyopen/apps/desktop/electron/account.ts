import {safeStorage} from 'electron';
import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {AccountClient} from '@easyopen/account-client';
export function createAccountClient(directory:string){
  const path=join(directory,'account-session.enc');
  const ready=async()=>{if(!safeStorage.isEncryptionAvailable()||(process.platform==='linux'&&safeStorage.getSelectedStorageBackend()==='basic_text'))throw new Error('이 PC에서 안전한 계정 저장소를 사용할 수 없습니다.');};
  return new AccountClient({ready,
    async get(){await ready();try{return safeStorage.decryptString(await readFile(path));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw new Error('계정 저장소를 읽지 못했습니다. 로그아웃 후 다시 연결하세요.');}},
    async set(token){await ready();await writeFile(path+'.tmp',safeStorage.encryptString(token),{mode:0o600});await rename(path+'.tmp',path);},
    async clear(){await rm(path,{force:true});await rm(path+'.tmp',{force:true});},
  },'desktop');
}
