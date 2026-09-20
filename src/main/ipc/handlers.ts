import { ipcMain, dialog, shell, app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type {
  ProcessingRequest,
  ProcessingProgressEvent,
  ProcessingResult,
  EngineSetupState,
  OutputFormat,
  AudioMetadata,
  DiagnosticsData,
} from '../../common/types.js';
import {
  OUTPUT_FORMAT_CONFIG,
  SUPPORTED_EXTENSIONS,
} from '../../common/constants.js';
import { ErrorCodes, sanitizeStderr } from '../../common/errors.js';
import { TokenRegistry } from '../tokens.js';
import {
  loadEngineManifest,
  getEngineManifestForPlatform,
} from '../engine/manifest.js';
import {
  downloadEngineBinary,
  getEngineBinaryPath,
} from '../engine/downloader.js';
import { verifyEngineHealth } from '../engine/health.js';
import { resolveBundledBinaries } from '../audio/binaries.js';
import { probeAudioFile } from '../audio/probe.js';
import {
  runAudioPipeline,
  exportFinalAudio,
  type PipelineResult,
} from '../audio/pipeline.js';
import {
  createJobTempDirectory,
  cleanupJobDirectory,
} from '../audio/cleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ActiveJob {
  jobId: string;
  jobDir: string;
  abortController: AbortController;
  pipelineResult?: PipelineResult;
  lastStderr: string;
  destinationPath?: string;
}

function throwIpcError(code: string, message: string, diagnostics?: DiagnosticsData): never {
  const err = new Error(message);
  (err as any).code = code;
  if (diagnostics) {
    (err as any).diagnostics = diagnostics;
  }
  throw err;
}

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  tokenRegistry: TokenRegistry
): () => void {
  const engineDir = path.join(app.getPath('userData'), 'engine');
  let currentDownloadAbort: AbortController | null = null;
  let activeJob: ActiveJob | null = null;

  const binaries = resolveBundledBinaries(process.resourcesPath);

  function getInstalledEnginePath(): string | null {
    try {
      const manifest = loadEngineManifest(process.resourcesPath);
      const entry = getEngineManifestForPlatform(manifest);
      const targetPath = getEngineBinaryPath(engineDir, entry);
      if (fs.existsSync(targetPath)) {
        return targetPath;
      }
    } catch {
      // ignore
    }
    return null;
  }

  // 1. getSetupStatus
  ipcMain.handle('engine:getStatus', async (): Promise<EngineSetupState> => {
    const enginePath = getInstalledEnginePath();
    if (!enginePath) {
      return { status: 'uninstalled' };
    }
    const health = await verifyEngineHealth(enginePath);
    if (health.ok) {
      return { status: 'installed', installedVersion: health.version };
    }
    return { status: 'error', error: health.error };
  });

  // 2. downloadEngine
  ipcMain.handle('engine:download', async (): Promise<EngineSetupState> => {
    if (currentDownloadAbort) {
      currentDownloadAbort.abort();
    }
    currentDownloadAbort = new AbortController();

    try {
      const manifest = loadEngineManifest(process.resourcesPath);
      const entry = getEngineManifestForPlatform(manifest);

      const downloadedPath = await downloadEngineBinary(entry, {
        engineDir,
        signal: currentDownloadAbort.signal,
        onProgress: (prog) => {
          mainWindow.webContents.send('engine:downloadProgress', prog);
        },
      });

      const health = await verifyEngineHealth(downloadedPath);
      if (!health.ok) {
        throw new Error(health.error || 'Engine failed health check');
      }

      currentDownloadAbort = null;
      return { status: 'installed', installedVersion: health.version };
    } catch (err: any) {
      currentDownloadAbort = null;
      const errorMsg = err?.message || String(err) || 'Failed to download engine';
      const error = new Error(errorMsg);
      (error as any).code = err?.code || err?.name || ErrorCodes.ENGINE_DOWNLOAD_FAILED;
      throw error;
    }
  });

  // 3. cancelEngineDownload
  ipcMain.handle('engine:cancelDownload', async () => {
    if (currentDownloadAbort) {
      currentDownloadAbort.abort();
      currentDownloadAbort = null;
    }
    return { ok: true };
  });

  // 4. chooseInputFile
  ipcMain.handle('audio:chooseInputFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio File',
      properties: ['openFile'],
      filters: [
        {
          name: 'Audio Files',
          extensions: SUPPORTED_EXTENSIONS.map((e) => e.replace('.', '')),
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext as any)) {
      throwIpcError(
        ErrorCodes.UNSUPPORTED_EXTENSION,
        'Unsupported audio format. Supported: .m4a, .mp3, .wav, .flac'
      );
    }

    const token = tokenRegistry.register(filePath);
    return {
      token,
      filename: path.basename(filePath),
      pathExt: ext,
    };
  });

  // 5. inspectAudio
  ipcMain.handle('audio:inspect', async (_, fileToken: string): Promise<AudioMetadata> => {
    const filePath = tokenRegistry.resolve(fileToken);
    if (!filePath) {
      throwIpcError(
        ErrorCodes.INVALID_TOKEN,
        'Audio reference is invalid or expired'
      );
    }

    try {
      return await probeAudioFile(binaries.ffprobe, filePath);
    } catch (err: any) {
      throwIpcError(
        err.code || err.name || ErrorCodes.CORRUPT_INPUT,
        err.message || 'Failed to inspect audio file'
      );
    }
  });

  // 6. startProcessing
  ipcMain.handle('audio:startProcessing', async (_, request: ProcessingRequest): Promise<ProcessingResult> => {
    if (activeJob) {
      throwIpcError(
        ErrorCodes.PROCESS_FAILED,
        'Another processing job is already in progress'
      );
    }

    const enginePath = getInstalledEnginePath();
    if (!enginePath) {
      throwIpcError(
        ErrorCodes.ENGINE_DOWNLOAD_FAILED,
        'Speech engine is not installed'
      );
    }

    const inputPath = tokenRegistry.resolve(request.inputFileToken);
    if (!inputPath || !fs.existsSync(inputPath)) {
      throwIpcError(
        ErrorCodes.INVALID_TOKEN,
        'Input audio file not found or expired'
      );
    }

    const jobId = Math.random().toString(36).substring(2, 10);
    const jobDir = createJobTempDirectory(jobId);
    const abortController = new AbortController();

    activeJob = {
      jobId,
      jobDir,
      abortController,
      lastStderr: '',
    };

    try {
      const pipelineResult = await runAudioPipeline({
        jobId,
        inputFilePath: inputPath,
        jobDir,
        preset: request.preset,
        loudness: request.loudness,
        outputFormat: request.outputFormat,
        ffmpegPath: binaries.ffmpeg,
        ffprobePath: binaries.ffprobe,
        deepFilterPath: enginePath,
        signal: abortController.signal,
        onProgress: (event: ProcessingProgressEvent) => {
          mainWindow.webContents.send('audio:progress', event);
        },
      });

      activeJob.pipelineResult = pipelineResult;

      // Register tokens for previews
      const originalAudioToken = tokenRegistry.register(
        pipelineResult.originalPreviewPath,
        jobId
      );
      const cleanedAudioToken = tokenRegistry.register(
        pipelineResult.cleanedPreviewPath,
        jobId
      );

      return {
        jobId,
        durationSeconds: pipelineResult.durationSeconds,
        originalAudioToken,
        cleanedAudioToken,
      };
    } catch (err: any) {
      const isCancelled = err.name === ErrorCodes.PROCESS_CANCELLED;
      const rawStderr = err.stderr || activeJob.lastStderr || err.message;
      const sanitized = sanitizeStderr(
        rawStderr,
        os.homedir(),
        jobDir
      );

      cleanupJobDirectory(jobDir);
      tokenRegistry.revokeJobTokens(jobId);
      activeJob = null;

      const diagnostics: DiagnosticsData = {
        appVersion: app.getVersion(),
        os: process.platform,
        arch: process.arch,
        stage: 'denoising',
        exitCode: err.exitCode,
        sanitizedStderr: sanitized,
      };

      throwIpcError(
        isCancelled ? ErrorCodes.PROCESS_CANCELLED : ErrorCodes.PROCESS_FAILED,
        err.message || 'Processing failed',
        diagnostics
      );
    }
  });

  // 7. cancelProcessing
  ipcMain.handle('audio:cancelProcessing', async (_, jobId: string) => {
    if (activeJob && activeJob.jobId === jobId) {
      activeJob.abortController.abort();
      cleanupJobDirectory(activeJob.jobDir);
      tokenRegistry.revokeJobTokens(jobId);
      activeJob = null;
    }
    return { ok: true };
  });

  // 8. chooseOutputPath
  ipcMain.handle(
    'audio:chooseOutputPath',
    async (_, suggestedName: string, format: OutputFormat) => {
      const config = OUTPUT_FORMAT_CONFIG[format];
      const defaultName = suggestedName.replace(/\.[^/.]+$/, '') + config.extension;

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Cleaned Audio',
        defaultPath: defaultName,
        filters: [
          {
            name: config.description,
            extensions: [config.extension.replace('.', '')],
          },
        ],
      });

      return result.canceled ? null : result.filePath;
    }
  );

  // 9. exportProcessed
  ipcMain.handle(
    'audio:exportProcessed',
    async (_, jobId: string, destinationPath: string, format: OutputFormat) => {
      if (!activeJob || activeJob.jobId !== jobId || !activeJob.pipelineResult) {
        throwIpcError(
          ErrorCodes.PROCESS_FAILED,
          'Processing result not found or expired'
        );
      }

      try {
        await exportFinalAudio(
          binaries.ffmpeg,
          activeJob.pipelineResult.normalizedMasterPath,
          destinationPath,
          format
        );

        activeJob.destinationPath = destinationPath;

        // Cleanup job intermediates once exported
        cleanupJobDirectory(activeJob.jobDir);
        activeJob = null;

        return { ok: true, destinationPath };
      } catch (err: any) {
        throwIpcError(
          ErrorCodes.EXPORT_FAILED,
          `Failed to export audio: ${err.message}`
        );
      }
    }
  );

  // 10. openOutputFolder
  ipcMain.handle('audio:openOutputFolder', async (_, targetPath: string) => {
    if (targetPath && fs.existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
      return { ok: true };
    }
    return { ok: false };
  });

  // 11. getThirdPartyNotices
  ipcMain.handle('app:getNotices', async () => {
    const noticePaths = [
      path.join(process.resourcesPath, 'legal/THIRD_PARTY_NOTICES.md'),
      path.join(__dirname, '../../legal/THIRD_PARTY_NOTICES.md'),
      path.join(__dirname, '../../../legal/THIRD_PARTY_NOTICES.md'),
      path.join(process.cwd(), 'legal/THIRD_PARTY_NOTICES.md'),
    ];

    for (const p of noticePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8');
      }
    }

    return 'AudioX uses FFmpeg under the GNU LGPL v2.1 or later. Noise suppression is provided by DeepFilterNet.';
  });

  return () => {
    ipcMain.removeHandler('engine:getStatus');
    ipcMain.removeHandler('engine:download');
    ipcMain.removeHandler('engine:cancelDownload');
    ipcMain.removeHandler('audio:chooseInputFile');
    ipcMain.removeHandler('audio:inspect');
    ipcMain.removeHandler('audio:startProcessing');
    ipcMain.removeHandler('audio:cancelProcessing');
    ipcMain.removeHandler('audio:chooseOutputPath');
    ipcMain.removeHandler('audio:exportProcessed');
    ipcMain.removeHandler('audio:openOutputFolder');
    ipcMain.removeHandler('app:getNotices');
  };
}
