export type UpdatePhase='disabled'|'idle'|'checking'|'current'|'available'|'downloading'|'ready'|'error';
export type UpdatePort={
  isEnabled:boolean;
  checkForUpdateAsync():Promise<{isAvailable:boolean;isRollBackToEmbedded?:boolean}>;
  fetchUpdateAsync():Promise<{isNew:boolean;isRollBackToEmbedded?:boolean}>;
  reloadAsync():Promise<void>;
};
export function createAppUpdates(port:UpdatePort, notify:(phase:UpdatePhase)=>void) {
  let phase:UpdatePhase=port.isEnabled?'idle':'disabled';
  const set=(value:UpdatePhase)=>{phase=value;notify(value);};
  return {
    get phase(){return phase;},
    async check(){
      if(!port.isEnabled||['checking','downloading','ready'].includes(phase))return;
      set('checking');
      try {const result=await port.checkForUpdateAsync();set(result.isAvailable||result.isRollBackToEmbedded?'available':'current');}
      catch {set('error');}
    },
    async download(){
      if(phase!=='available')return;
      set('downloading');
      try {const result=await port.fetchUpdateAsync();set(result.isNew||result.isRollBackToEmbedded?'ready':'current');}
      catch {set('error');}
    },
    async restart(){
      if(phase!=='ready')return;
      try {await port.reloadAsync();}catch {set('ready');}
    },
  };
}
