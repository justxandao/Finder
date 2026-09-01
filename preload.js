const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    toggleAlwaysOnTop: (isAlwaysOnTop) => ipcRenderer.send('toggle-always-on-top', isAlwaysOnTop),
    saveCsvFile: (filename, content) => ipcRenderer.invoke('save-csv-file', { filename, content }),
    openCsvFolder: () => ipcRenderer.invoke('open-csv-folder')
});

