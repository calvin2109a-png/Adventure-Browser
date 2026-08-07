const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => {
    if (typeof url === 'string') {
      ipcRenderer.invoke('open-external', url);
    }
  },
  onOpenUrl: (callback) => {
    ipcRenderer.on('open-url', (_, url) => {
      if (typeof callback === 'function') callback(url);
    });
  }
});
