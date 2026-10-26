export function managedAppOrigin(value:string){
  const url=new URL(value);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.username||url.password||!url.port)throw new Error('로컬 앱 주소가 안전하지 않습니다.');
  return url.origin;
}

export function classifyManagedNavigation(value:string,allowedOrigin:string):'internal'|'external'|'deny'{
  try{
    const url=new URL(value);
    if(url.username||url.password)return 'deny';
    if(url.origin===allowedOrigin)return 'internal';
    if(url.protocol==='https:')return 'external';
  }catch{/* invalid URLs are denied */}
  return 'deny';
}
