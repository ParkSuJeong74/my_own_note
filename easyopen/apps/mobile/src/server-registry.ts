export type ServerStatus = 'unknown' | 'checking' | 'online' | 'offline';

export type SavedServer = {
  id: string;
  name: string;
  url: string;
  status: ServerStatus;
  lastCheckedAt: string | null;
};

export type ServerRegistry = {
  defaultServerId: string | null;
  servers: SavedServer[];
};

export const emptyServerRegistry = ():ServerRegistry=>({defaultServerId:null,servers:[]});

function isPrivateIpv4(hostname:string):boolean{
  const parts=hostname.split('.').map(Number);
  if(parts.length!==4||parts.some(part=>!Number.isInteger(part)||part<0||part>255))return false;
  return parts[0]===10||parts[0]===192&&parts[1]===168||parts[0]===172&&parts[1]>=16&&parts[1]<=31;
}

export function normalizeLanServerUrl(value:string):string|null{
  const candidate=value.trim();
  if(!candidate)return null;
  try{
    const parsed=new URL(candidate.includes('://')?candidate:`http://${candidate}`);
    if(parsed.protocol!=='http:'||parsed.username||parsed.password||parsed.search||parsed.hash)return null;
    if(!isPrivateIpv4(parsed.hostname)&&!parsed.hostname.endsWith('.local'))return null;
    if(parsed.port&&parsed.port!=='8096')return null;
    parsed.port='8096';parsed.pathname='';
    return parsed.href.replace(/\/$/,'');
  }catch{return null;}
}

export function jellyfinWebUrl(serverUrl:string):string|null{
  const normalized=normalizeLanServerUrl(serverUrl);
  return normalized?`${normalized}/web/index.html`:null;
}

export function isAllowedJellyfinNavigation(serverUrl:string,targetUrl:string):boolean{
  const normalized=normalizeLanServerUrl(serverUrl);
  if(!normalized)return false;
  if(targetUrl==='about:blank')return true;
  try{
    const server=new URL(normalized);
    const target=new URL(targetUrl);
    return target.protocol===server.protocol&&target.hostname===server.hostname&&target.port===server.port&&
      !target.username&&!target.password;
  }catch{return false;}
}

export function addServer(registry:ServerRegistry,input:{id:string;name:string;url:string}):ServerRegistry{
  const url=normalizeLanServerUrl(input.url);
  const id=input.id.trim();
  const name=input.name.trim();
  if(!id||!name||!url)throw new Error('invalid-server');
  const server:SavedServer={id,name,url,status:'unknown',lastCheckedAt:null};
  const existing=registry.servers.findIndex(item=>item.id===id||item.url===url);
  const servers=existing>=0?registry.servers.map((item,index)=>index===existing?{...item,...server}:item):[...registry.servers,server];
  return {servers,defaultServerId:registry.defaultServerId&&servers.some(item=>item.id===registry.defaultServerId)?registry.defaultServerId:id};
}

export function setDefaultServer(registry:ServerRegistry,id:string):ServerRegistry{
  if(!registry.servers.some(server=>server.id===id))return registry;
  return {...registry,defaultServerId:id};
}

export function removeServer(registry:ServerRegistry,id:string):ServerRegistry{
  const servers=registry.servers.filter(server=>server.id!==id);
  return {servers,defaultServerId:registry.defaultServerId===id?(servers[0]?.id??null):registry.defaultServerId};
}

export function updateServerStatus(registry:ServerRegistry,id:string,status:ServerStatus,checkedAt:string|null):ServerRegistry{
  return {...registry,servers:registry.servers.map(server=>server.id===id?{...server,status,lastCheckedAt:checkedAt}:server)};
}

export function parseServerRegistry(value:unknown):ServerRegistry{
  if(!value||typeof value!=='object')return emptyServerRegistry();
  const source=value as Partial<ServerRegistry>;
  if(!Array.isArray(source.servers))return emptyServerRegistry();
  let registry=emptyServerRegistry();
  for(const item of source.servers){
    if(!item||typeof item!=='object')continue;
    const server=item as Partial<SavedServer>;
    if(typeof server.id!=='string'||typeof server.name!=='string'||typeof server.url!=='string')continue;
    try{registry=addServer(registry,{id:server.id,name:server.name,url:server.url});}catch{}
  }
  return typeof source.defaultServerId==='string'?setDefaultServer(registry,source.defaultServerId):registry;
}
