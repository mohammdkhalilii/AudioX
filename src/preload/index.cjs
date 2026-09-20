const { contextBridge, ipcRenderer, clipboard } = require('electron');

const api = {
  copyToClipboard: (text) => clipboard.writeText(text),
  getSetupStatus: () => ipcRenderer.invoke('engine:getStatus'),
  downloadEngine: () => ipcRenderer.invoke('engine:download'),
  cancelEngineDownload: () => ipcRenderer.invoke('engine:cancelDownload'),
  chooseInputFile: () => ipcRenderer.invoke('audio:chooseInputFile'),
  inspectAudio: (fileToken) => ipcRenderer.invoke('audio:inspect', fileToken),
  startProcessing: (request) => ipcRenderer.invoke('audio:startProcessing', request),
  cancelProcessing: (jobId) => ipcRenderer.invoke('audio:cancelProcessing', jobId),
  chooseOutputPath: (suggestedName, format) =>
    ipcRenderer.invoke('audio:chooseOutputPath', suggestedName, format),
  exportProcessed: (jobId, destinationPath, format) =>
    ipcRenderer.invoke('audio:exportProcessed', jobId, destinationPath, format),
  openOutputFolder: (filePath) => ipcRenderer.invoke('audio:openOutputFolder', filePath),
  getThirdPartyNotices: () => ipcRenderer.invoke('app:getNotices'),

  onProcessingProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('audio:progress', handler);
    return () => {
      ipcRenderer.removeListener('audio:progress', handler);
    };
  },

  onDownloadProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('engine:downloadProgress', handler);
    return () => {
      ipcRenderer.removeListener('engine:downloadProgress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('audiox', api);
