const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  shredFiles: (filePaths) => ipcRenderer.invoke('shred-files', filePaths),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  onAddFilesFromArgs: (callback) => ipcRenderer.on('add-files-from-args', (event, filePaths) => callback(filePaths))
});