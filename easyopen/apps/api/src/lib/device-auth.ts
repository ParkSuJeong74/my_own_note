import {createHash,randomBytes} from 'node:crypto';
export const deviceHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const validDeviceToken=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function normalizeUserCode(value:unknown){
  if(typeof value!=='string'||value.length>20)return null;
  const code=value.replace(/[- ]/g,'').toUpperCase();
  return /^[A-F0-9]{12}$/.test(code)?code:null;
}
export function newDeviceRequest(){
  const deviceCode=randomBytes(32).toString('hex');
  const code=randomBytes(6).toString('hex').toUpperCase();
  return {deviceCode,userCode:code.match(/.{4}/g)!.join('-'),deviceHash:deviceHash(deviceCode),userCodeHash:deviceHash(code)};
}
