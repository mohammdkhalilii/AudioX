import type { DiagnosticsData, PipelineStage } from './types.js';

export const ErrorCodes = {
  UNSUPPORTED_EXTENSION: 'UNSUPPORTED_EXTENSION',
  INVALID_AUDIO_STREAM: 'INVALID_AUDIO_STREAM',
  CORRUPT_INPUT: 'CORRUPT_INPUT',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  ENGINE_DOWNLOAD_FAILED: 'ENGINE_DOWNLOAD_FAILED',
  ENGINE_CHECKSUM_MISMATCH: 'ENGINE_CHECKSUM_MISMATCH',
  ENGINE_HEALTHCHECK_FAILED: 'ENGINE_HEALTHCHECK_FAILED',
  INSUFFICIENT_STORAGE: 'INSUFFICIENT_STORAGE',
  PROCESS_FAILED: 'PROCESS_FAILED',
  PROCESS_CANCELLED: 'PROCESS_CANCELLED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.UNSUPPORTED_EXTENSION]:
    'Unsupported file type. Please choose an .m4a, .mp3, .wav, or .flac file.',
  [ErrorCodes.INVALID_AUDIO_STREAM]:
    'Invalid audio stream. The selected file does not contain a valid audio track.',
  [ErrorCodes.CORRUPT_INPUT]:
    'Could not read audio file. The file may be corrupt or damaged.',
  [ErrorCodes.UNSUPPORTED_PLATFORM]:
    'Your operating system or CPU architecture is not currently supported.',
  [ErrorCodes.ENGINE_DOWNLOAD_FAILED]:
    'Failed to download the speech-cleanup engine. Please check your internet connection and retry.',
  [ErrorCodes.ENGINE_CHECKSUM_MISMATCH]:
    'Engine download verification failed (checksum mismatch). The download was discarded for security.',
  [ErrorCodes.ENGINE_HEALTHCHECK_FAILED]:
    'Downloaded speech engine failed initial health check.',
  [ErrorCodes.INSUFFICIENT_STORAGE]:
    'Insufficient temporary disk space available to process this recording.',
  [ErrorCodes.PROCESS_FAILED]:
    'Audio processing encountered an error during execution.',
  [ErrorCodes.PROCESS_CANCELLED]: 'Processing was cancelled.',
  [ErrorCodes.EXPORT_FAILED]: 'Failed to save the processed audio file.',
  [ErrorCodes.INVALID_TOKEN]: 'Audio file reference has expired or is invalid.',
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred.',
};

/**
 * Sanitizes stderr / command output by stripping user home paths, usernames,
 * temporary directory paths, and file paths.
 */
export function sanitizeStderr(
  rawStderr: string,
  userHome?: string,
  tempDir?: string
): string {
  if (!rawStderr) return '';

  let sanitized = rawStderr;

  // Mask user's home path if known
  if (userHome && userHome.length > 2) {
    sanitized = sanitized.replaceAll(userHome, '<user_home>');
  }

  // Mask temp directory if known
  if (tempDir && tempDir.length > 2) {
    sanitized = sanitized.replaceAll(tempDir, '<temp_dir>');
  }

  // Regex mask common home directory patterns: /Users/username, /home/username, C:\Users\username
  sanitized = sanitized
    .replace(/(?:\/Users\/|\/home\/)[a-zA-Z0-9._-]+/g, '<user_home>')
    .replace(/[a-zA-Z]:\\Users\\[a-zA-Z0-9._-]+/g, '<user_home>')
    .replace(/(?:\/private)?\/tmp\/[a-zA-Z0-9._-]+/g, '<temp_dir>')
    .replace(/[a-zA-Z]:\\(?:Temp|TMP)\\[a-zA-Z0-9._-]+/g, '<temp_dir>');

  // Mask potential audio file names in quotes
  sanitized = sanitized.replace(/(['"])[^'"]+\.(wav|mp3|m4a|flac|aac)\1/gi, '$1<audio_file>$1');

  return sanitized.trim();
}

/**
 * Formats a DiagnosticsData object into a plain-text report for clipboard copy.
 */
export function formatDiagnosticsReport(data: DiagnosticsData): string {
  return [
    '=== AudioX Diagnostics ===',
    `App Version: ${data.appVersion}`,
    `OS: ${data.os} (${data.arch})`,
    `DeepFilterNet: ${data.deepFilterVersion || 'unknown'}`,
    `FFmpeg: ${data.ffmpegVersion || 'bundled'}`,
    `Failure Stage: ${data.stage || 'n/a'}`,
    `Exit Code: ${data.exitCode !== undefined && data.exitCode !== null ? data.exitCode : 'none'}`,
    '',
    '=== Sanitized Log ===',
    data.sanitizedStderr || '(no stderr output)',
  ].join('\n');
}
