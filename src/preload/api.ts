import type {
  EngineSetupState,
  ProcessingRequest,
  ProcessingResult,
  ProcessingProgressEvent,
  OutputFormat,
  AudioMetadata,
} from '../common/types.js';

export interface AudioXApi {
  copyToClipboard: (text: string) => void;
  getSetupStatus: () => Promise<EngineSetupState>;
  downloadEngine: () => Promise<EngineSetupState>;
  cancelEngineDownload: () => Promise<{ ok: boolean }>;
  chooseInputFile: () => Promise<{
    token: string;
    filename: string;
    pathExt: string;
  } | null>;
  inspectAudio: (fileToken: string) => Promise<AudioMetadata>;
  startProcessing: (request: ProcessingRequest) => Promise<ProcessingResult>;
  cancelProcessing: (jobId: string) => Promise<{ ok: boolean }>;
  chooseOutputPath: (
    suggestedName: string,
    format: OutputFormat
  ) => Promise<string | null>;
  exportProcessed: (
    jobId: string,
    destinationPath: string,
    format: OutputFormat
  ) => Promise<{ ok: boolean; destinationPath: string }>;
  openOutputFolder: (filePath: string) => Promise<{ ok: boolean }>;
  getThirdPartyNotices: () => Promise<string>;
  onProcessingProgress: (
    callback: (event: ProcessingProgressEvent) => void
  ) => () => void;
  onDownloadProgress: (
    callback: (progress: { bytesDownloaded: number; totalBytes: number }) => void
  ) => () => void;
}
