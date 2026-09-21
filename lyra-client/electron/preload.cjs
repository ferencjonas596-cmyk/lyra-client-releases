const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('lyra', {
  versions: () => ipcRenderer.invoke('lyra:versions'),
  cloud: () => ipcRenderer.invoke('lyra:cloud'),
  checkUpdate: () => ipcRenderer.invoke('lyra:check-update'),
  installUpdate: () => ipcRenderer.invoke('lyra:install-update')
});
