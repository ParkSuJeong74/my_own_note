export type StorageReader = { getItem(key:string):string|null };

export function loadManagedAppIds(storage:StorageReader|null|undefined):string[]{
  if(!storage)return [];
  try{
    const value:unknown=JSON.parse(storage.getItem('easyopen-managed-apps')??'[]');
    return Array.isArray(value)?[...new Set(value.filter((id):id is string=>typeof id==='string'&&/^[a-z0-9-]+$/.test(id)))]:[];
  }catch{return [];}
}

export function recordManagedAction(ids:string[],appId:string,kind:'install'|'update'|'remove',ok:boolean):string[]{
  if(!ok||kind==='update')return ids;
  if(kind==='remove')return ids.filter(id=>id!==appId);
  return ids.includes(appId)?ids:[...ids,appId];
}
