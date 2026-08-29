const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleAlwaysOnTop: (isAlwaysOnTop) => ipcRenderer.send('toggle-always-on-top', isAlwaysOnTop)
});
