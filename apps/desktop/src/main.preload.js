const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onConfigLoaded: callback => {
    ipcRenderer.on('app-config', (event, config) => callback(config));
  },

  getConfig: key => ipcRenderer.invoke('get-config', key),

  getPlatform: () => process.platform,
  isLocal: () => process.env.NODE_ENV === 'local',
});
