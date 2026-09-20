import type { SupportedExtension, OutputFormat, NoisePreset } from './types.js';

export const APP_ID = 'studio.emya.audiox';
export const APP_NAME = 'AudioX';

export const AUDIO_PROTOCOL_SCHEME = 'app-audio';

export const SUPPORTED_EXTENSIONS: readonly SupportedExtension[] = [
  '.m4a',
  '.mp3',
  '.wav',
  '.flac',
];

export const AUDIO_CONSTRAINTS = {
  SAMPLE_RATE: 48000,
  CHANNELS: 1, // Speech mono
  TRUE_PEAK_LIMIT: -1.5, // dBTP
  LRA_TARGET: 7,
  LUFS_TARGET_NATURAL: -18,
  LUFS_TARGET_LOUD: -16,
  LUFS_CUSTOM_MIN: -24,
  LUFS_CUSTOM_MAX: -12,
  LIGHT_DENOISED_WEIGHT: 0.7,
  LIGHT_ORIGINAL_WEIGHT: 0.3,
} as const;

export const OUTPUT_FORMAT_CONFIG: Record<
  OutputFormat,
  {
    extension: string;
    description: string;
    mimeType: string;
  }
> = {
  wav: {
    extension: '.wav',
    description: 'WAV (48 kHz mono, 24-bit PCM)',
    mimeType: 'audio/wav',
  },
  m4a: {
    extension: '.m4a',
    description: 'M4A (48 kHz mono AAC, 192 kb/s)',
    mimeType: 'audio/mp4',
  },
  mp3: {
    extension: '.mp3',
    description: 'MP3 (48 kHz mono, 192 kb/s)',
    mimeType: 'audio/mpeg',
  },
  flac: {
    extension: '.flac',
    description: 'FLAC (48 kHz mono, lossless level 8)',
    mimeType: 'audio/flac',
  },
};

export const PRESET_DESCRIPTIONS: Record<
  NoisePreset,
  {
    name: string;
    description: string;
    warning?: string;
  }
> = {
  light: {
    name: 'Light',
    description: 'Blends 70% cleaned voice with 30% natural ambience for subtler suppression.',
  },
  balanced: {
    name: 'Balanced',
    description: 'Standard DeepFilterNet cleanup. Recommended for most recordings.',
  },
  strong: {
    name: 'Strong',
    description: 'Applies deep post-filtering for aggressive noise removal.',
    warning: 'May sound less natural or introduce slight voice artifacts in quiet passages.',
  },
};

/**
 * Conservative temporary storage required:
 * (durationSeconds * 48000 samples/s * 4 bytes/sample * 4 safety factor) + 100 MB buffer
 */
export function estimateRequiredTempBytes(durationSeconds: number): number {
  const pcmBytesPerSecond = AUDIO_CONSTRAINTS.SAMPLE_RATE * 4; // 32-bit float
  const safePcmEstimate = durationSeconds * pcmBytesPerSecond * 4;
  const buffer100MB = 100 * 1024 * 1024;
  return Math.ceil(safePcmEstimate + buffer100MB);
}
