export type SupportedExtension = '.m4a' | '.mp3' | '.wav' | '.flac';

export type NoisePreset = 'light' | 'balanced' | 'strong';

export type LoudnessMode = 'natural' | 'loud' | 'custom';

export interface LoudnessConfig {
  mode: LoudnessMode;
  customLufs?: number; // -24 to -12
}

export type OutputFormat = 'wav' | 'm4a' | 'mp3' | 'flac';

export type PipelineStage =
  | 'preparing'
  | 'denoising'
  | 'normalizing'
  | 'previewing'
  | 'completed';

export interface AudioMetadata {
  format: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  codec: string;
  bitrate?: number;
}

export interface ProcessingRequest {
  inputFileToken: string;
  preset: NoisePreset;
  loudness: LoudnessConfig;
  outputFormat: OutputFormat;
}

export interface ProcessingProgressEvent {
  jobId: string;
  stage: PipelineStage;
  stageProgress: number; // 0 to 100, or -1 for indeterminate
  elapsedSeconds: number;
  detail?: string;
}

export interface ProcessingResult {
  jobId: string;
  durationSeconds: number;
  originalAudioToken: string;
  cleanedAudioToken: string;
}

export type EngineStatus =
  | 'uninstalled'
  | 'downloading'
  | 'verifying'
  | 'installed'
  | 'error';

export interface EngineSetupState {
  status: EngineStatus;
  installedVersion?: string;
  bytesDownloaded?: number;
  totalBytes?: number;
  error?: string;
}

export interface EngineManifestEntry {
  version: string;
  url: string;
  expectedSize: number;
  sha256: string;
  filename: string;
}

export interface EngineManifest {
  version: string;
  platforms: {
    'darwin-arm64'?: EngineManifestEntry;
    'win32-x64'?: EngineManifestEntry;
    'linux-x64'?: EngineManifestEntry;
    [key: string]: EngineManifestEntry | undefined;
  };
}

export interface DiagnosticsData {
  appVersion: string;
  os: string;
  arch: string;
  deepFilterVersion?: string;
  ffmpegVersion?: string;
  stage?: PipelineStage;
  exitCode?: number | null;
  sanitizedStderr: string;
}

export interface AppError {
  code: string;
  message: string;
  diagnostics?: DiagnosticsData;
}
