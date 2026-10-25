import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('easyopen',{
  catalog:()=>ipcRenderer.invoke('easyopen:catalog'),
  machine:()=>ipcRenderer.invoke('easyopen:machine'),
  status:(id:string)=>ipcRenderer.invoke('easyopen:status',id),
  action:(id:string,kind:'install'|'update'|'remove')=>ipcRenderer.invoke('easyopen:action',id,kind),
  official:(id:string)=>ipcRenderer.invoke('easyopen:official',id),
  onLog:(callback:(id:string,text:string)=>void)=>{
    const listener=(_event:Electron.IpcRendererEvent,id:string,text:string)=>callback(id,text);
    ipcRenderer.on('easyopen:log',listener);
    return ()=>ipcRenderer.off('easyopen:log',listener);
  }
});
