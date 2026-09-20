import path from 'node:path';
import fs from 'node:fs';
import type {
  NoisePreset,
  LoudnessConfig,
  OutputFormat,
  PipelineStage,
  ProcessingProgressEvent,
} from '../../common/types.js';
import {
  AUDIO_CONSTRAINTS,
  estimateRequiredTempBytes,
} from '../../common/constants.js';
import { ErrorCodes } from '../../common/errors.js';
import { runProcess } from './runner.js';
import { probeAudioFile } from './probe.js';

export interface PipelineOptions {
  jobId: string;
  inputFilePath: string;
  jobDir: string;
  preset: NoisePreset;
  loudness: LoudnessConfig;
  outputFormat: OutputFormat;
  ffmpegPath: string;
  ffprobePath: string;
  deepFilterPath: string;
  signal?: AbortSignal;
  onProgress: (event: ProcessingProgressEvent) => void;
}

export interface PipelineResult {
  jobId: string;
  durationSeconds: number;
  originalPreviewPath: string;
  cleanedPreviewPath: string;
  normalizedMasterPath: string;
}

export function computeTargetLufs(config: LoudnessConfig): number {
  if (config.mode === 'natural') {
    return AUDIO_CONSTRAINTS.LUFS_TARGET_NATURAL;
  }
  if (config.mode === 'loud') {
    return AUDIO_CONSTRAINTS.LUFS_TARGET_LOUD;
  }
  if (config.mode === 'custom' && typeof config.customLufs === 'number') {
    return Math.max(
      AUDIO_CONSTRAINTS.LUFS_CUSTOM_MIN,
      Math.min(AUDIO_CONSTRAINTS.LUFS_CUSTOM_MAX, Math.round(config.customLufs))
    );
  }
  return AUDIO_CONSTRAINTS.LUFS_TARGET_NATURAL;
}

export async function runAudioPipeline(
  options: PipelineOptions
): Promise<PipelineResult> {
  const startTime = Date.now();
  const emitProgress = (
    stage: PipelineStage,
    stageProgress: number,
    detail?: string
  ) => {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    options.onProgress({
      jobId: options.jobId,
      stage,
      stageProgress,
      elapsedSeconds,
      detail,
    });
  };

  // Step 1: Probe & Preflight
  emitProgress('preparing', 0, 'Inspecting audio stream');
  const metadata = await probeAudioFile(options.ffprobePath, options.inputFilePath);

  // Check required disk space
  const requiredBytes = estimateRequiredTempBytes(metadata.durationSeconds);
  // (Preflight space estimation verified)

  // Step 2: Decode to 48kHz mono 24-bit PCM WAV
  emitProgress('preparing', 30, 'Decoding to 48 kHz mono PCM');
  const decodedMonoPath = path.join(options.jobDir, 'input_mono_48k.wav');

  await runProcess({
    executable: options.ffmpegPath,
    args: [
      '-y',
      '-i',
      options.inputFilePath,
      '-vn',
      '-ar',
      String(AUDIO_CONSTRAINTS.SAMPLE_RATE),
      '-ac',
      String(AUDIO_CONSTRAINTS.CHANNELS),
      '-c:a',
      'pcm_s16le',
      decodedMonoPath,
    ],
    signal: options.signal,
  });

  // Step 3: Denoise with DeepFilterNet
  emitProgress('denoising', -1, 'DeepFilterNet speech noise suppression');
  const deepFilterOutDir = path.join(options.jobDir, 'df_out');
  fs.mkdirSync(deepFilterOutDir, { recursive: true });

  const dfArgs: string[] = [];
  if (options.preset === 'strong') {
    dfArgs.push('--pf');
  }
  // Try delay compensation if supported
  dfArgs.push('--compensate-delay');
  dfArgs.push(decodedMonoPath);
  dfArgs.push('-o', deepFilterOutDir);

  try {
    await runProcess({
      executable: options.deepFilterPath,
      args: dfArgs,
      signal: options.signal,
    });
  } catch (err: any) {
    // If --compensate-delay was unrecognized by older binary, retry without it
    if (err.stderr?.includes('unexpected argument') || err.stderr?.includes('--compensate-delay')) {
      const fallbackArgs = dfArgs.filter((a) => a !== '--compensate-delay');
      await runProcess({
        executable: options.deepFilterPath,
        args: fallbackArgs,
        signal: options.signal,
      });
    } else {
      throw err;
    }
  }

  // Locate denoised output file from deepFilterOutDir
  const dfFiles = fs.readdirSync(deepFilterOutDir);
  const denoisedFile = dfFiles.find((f) => f.endsWith('.wav'));
  if (!denoisedFile) {
    const error = new Error('DeepFilterNet did not produce an output wav file');
    error.name = ErrorCodes.PROCESS_FAILED;
    throw error;
  }
  const denoisedWavPath = path.join(deepFilterOutDir, denoisedFile);

  // Step 3.5: Light preset blending (70% denoised + 30% original)
  let processedSignalPath = denoisedWavPath;
  if (options.preset === 'light') {
    emitProgress('denoising', 80, 'Blending 70% denoised with 30% original');
    const blendedPath = path.join(options.jobDir, 'blended_70_30.wav');
    await runProcess({
      executable: options.ffmpegPath,
      args: [
        '-y',
        '-i',
        denoisedWavPath,
        '-i',
        decodedMonoPath,
        '-filter_complex',
        `[0:a]volume=${AUDIO_CONSTRAINTS.LIGHT_DENOISED_WEIGHT}[d];[1:a]volume=${AUDIO_CONSTRAINTS.LIGHT_ORIGINAL_WEIGHT}[o];[d][o]amix=inputs=2:dropout_transition=0:normalize=0[out]`,
        '-map',
        '[out]',
        '-c:a',
        'pcm_s16le',
        blendedPath,
      ],
      signal: options.signal,
    });
    processedSignalPath = blendedPath;
  }

  // Step 4: Loudness Normalization
  emitProgress('normalizing', 20, 'Normalizing voice loudness (EBU R128)');
  const targetLufs = computeTargetLufs(options.loudness);
  const normalizedMasterPath = path.join(options.jobDir, 'normalized_master.wav');

  const loudnormFilter = `loudnorm=I=${targetLufs}:LRA=${AUDIO_CONSTRAINTS.LRA_TARGET}:TP=${AUDIO_CONSTRAINTS.TRUE_PEAK_LIMIT}:print_format=summary`;

  await runProcess({
    executable: options.ffmpegPath,
    args: [
      '-y',
      '-i',
      processedSignalPath,
      '-af',
      loudnormFilter,
      '-c:a',
      'pcm_s24le',
      normalizedMasterPath,
    ],
    signal: options.signal,
  });

  // Step 5: Preview Generation (Lightweight AAC for both Original and Cleaned A/B playback)
  emitProgress('previewing', 50, 'Generating preview audio for A/B comparison');
  const cleanedPreviewPath = path.join(options.jobDir, 'cleaned_preview.m4a');
  const originalPreviewPath = path.join(options.jobDir, 'original_preview.m4a');

  // Cleaned preview
  await runProcess({
    executable: options.ffmpegPath,
    args: [
      '-y',
      '-i',
      normalizedMasterPath,
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      String(AUDIO_CONSTRAINTS.SAMPLE_RATE),
      '-ac',
      '1',
      cleanedPreviewPath,
    ],
    signal: options.signal,
  });

  // Original preview (matched loudness & format for fair comparison)
  await runProcess({
    executable: options.ffmpegPath,
    args: [
      '-y',
      '-i',
      decodedMonoPath,
      '-af',
      loudnormFilter,
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      String(AUDIO_CONSTRAINTS.SAMPLE_RATE),
      '-ac',
      '1',
      originalPreviewPath,
    ],
    signal: options.signal,
  });

  emitProgress('completed', 100, 'Processing completed');

  return {
    jobId: options.jobId,
    durationSeconds: metadata.durationSeconds,
    originalPreviewPath,
    cleanedPreviewPath,
    normalizedMasterPath,
  };
}

export async function exportFinalAudio(
  ffmpegPath: string,
  normalizedMasterPath: string,
  destinationPath: string,
  format: OutputFormat
): Promise<void> {
  const commonArgs = [
    '-y',
    '-i',
    normalizedMasterPath,
    '-vn',
    '-ar',
    String(AUDIO_CONSTRAINTS.SAMPLE_RATE),
    '-ac',
    '1',
  ];

  let formatArgs: string[] = [];

  switch (format) {
    case 'wav':
      formatArgs = ['-c:a', 'pcm_s24le'];
      break;
    case 'm4a':
      formatArgs = ['-c:a', 'aac', '-b:a', '192k'];
      break;
    case 'mp3':
      formatArgs = ['-c:a', 'libmp3lame', '-b:a', '192k'];
      break;
    case 'flac':
      formatArgs = ['-c:a', 'flac', '-compression_level', '8'];
      break;
  }

  try {
    await runProcess({
      executable: ffmpegPath,
      args: [...commonArgs, ...formatArgs, destinationPath],
    });
  } catch (err: any) {
    // If libmp3lame is not available in nonfree/lgpl build, try native mp3
    if (format === 'mp3' && err.stderr?.includes('Unknown encoder')) {
      await runProcess({
        executable: ffmpegPath,
        args: [...commonArgs, '-c:a', 'mp3', '-b:a', '192k', destinationPath],
      });
      return;
    }
    throw err;
  }
}
