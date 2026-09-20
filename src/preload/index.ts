import { contextBridge, ipcRenderer, clipboard } from 'electron';
import type { AudioXApi } from './api.js';
import type {
  ProcessingRequest,
  OutputFormat,
  ProcessingProgressEvent,
} from '../common/types.js';

const api: AudioXApi = {
  copyToClipboard: (text: string) => {
    clipboard.writeText(text);
  },
  getSetupStatus: () => ipcRenderer.invoke('engine:getStatus'),
  downloadEngine: () => ipcRenderer.invoke('engine:download'),
  cancelEngineDownload: () => ipcRenderer.invoke('engine:cancelDownload'),
  chooseInputFile: () => ipcRenderer.invoke('audio:chooseInputFile'),
  inspectAudio: (fileToken: string) =>
    ipcRenderer.invoke('audio:inspect', fileToken),
  startProcessing: (request: ProcessingRequest) =>
    ipcRenderer.invoke('audio:startProcessing', request),
  cancelProcessing: (jobId: string) =>
    ipcRenderer.invoke('audio:cancelProcessing', jobId),
  chooseOutputPath: (suggestedName: string, format: OutputFormat) =>
    ipcRenderer.invoke('audio:chooseOutputPath', suggestedName, format),
  exportProcessed: (
    jobId: string,
    destinationPath: string,
    format: OutputFormat
  ) =>
    ipcRenderer.invoke('audio:exportProcessed', jobId, destinationPath, format),
  openOutputFolder: (filePath: string) =>
    ipcRenderer.invoke('audio:openOutputFolder', filePath),
  getThirdPartyNotices: () => ipcRenderer.invoke('app:getNotices'),

  onProcessingProgress: (callback: (event: ProcessingProgressEvent) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: ProcessingProgressEvent
    ) => callback(progress);
    ipcRenderer.on('audio:progress', handler);
    return () => {
      ipcRenderer.removeListener('audio:progress', handler);
    };
  },

  onDownloadProgress: (
    callback: (progress: { bytesDownloaded: number; totalBytes: number }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: { bytesDownloaded: number; totalBytes: number }
    ) => callback(progress);
    ipcRenderer.on('engine:downloadProgress', handler);
    return () => {
      ipcRenderer.removeListener('engine:downloadProgress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('audiox', api);
