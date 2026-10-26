import {contextBridge,ipcRenderer} from 'electron';
contextBridge.exposeInMainWorld('easyopen',{
  machine:()=>ipcRenderer.invoke('easyopen:machine'),
  runtimeStatus:()=>ipcRenderer.invoke('easyopen:runtime-status'),
  runtimeAction:(action:'install-wsl'|'install-docker'|'start-docker')=>ipcRenderer.invoke('easyopen:runtime-action',action),
  containers:()=>ipcRenderer.invoke('easyopen:containers'),
  containerAction:(action:'start'|'stop'|'restart'|'remove',name:string)=>ipcRenderer.invoke('easyopen:container-action',action,name),
  containerLogs:(name:string)=>ipcRenderer.invoke('easyopen:container-logs',name),
  containerAppStatus:(id:string)=>ipcRenderer.invoke('easyopen:container-app-status',id),
  installContainerApp:(id:string)=>ipcRenderer.invoke('easyopen:install-container-app',id),
  cancelContainerInstall:(id:string)=>ipcRenderer.invoke('easyopen:cancel-container-install',id),
  openContainerApp:(id:string)=>ipcRenderer.invoke('easyopen:open-container-app',id),
  cosyvoiceReadiness:()=>ipcRenderer.invoke('easyopen:cosyvoice-readiness'),
  status:(id:string)=>ipcRenderer.invoke('easyopen:status',id),
  updateStatus:(id:string)=>ipcRenderer.invoke('easyopen:update-status',id),
  action:(id:string,kind:'install'|'update'|'remove')=>ipcRenderer.invoke('easyopen:action',id,kind),
  official:(id:string)=>ipcRenderer.invoke('easyopen:official',id),
  onLog:(callback:(id:string,text:string)=>void)=>{
    const listener=(_event:Electron.IpcRendererEvent,id:string,text:string)=>callback(id,text);
    ipcRenderer.on('easyopen:log',listener);
    return ()=>ipcRenderer.off('easyopen:log',listener);
  },
  onRuntimeLog:(callback:(text:string)=>void)=>{const listener=(_event:Electron.IpcRendererEvent,text:string)=>callback(text);ipcRenderer.on('easyopen:runtime-log',listener);return ()=>ipcRenderer.off('easyopen:runtime-log',listener);},
  onContainerInstallProgress:(callback:(id:string,value:{stage:string;percent:number;message:string})=>void)=>{const listener=(_event:Electron.IpcRendererEvent,id:string,value:{stage:string;percent:number;message:string})=>callback(id,value);ipcRenderer.on('easyopen:container-install-progress',listener);return ()=>ipcRenderer.off('easyopen:container-install-progress',listener);}
});
