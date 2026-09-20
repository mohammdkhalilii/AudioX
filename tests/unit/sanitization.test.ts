import { describe, it, expect } from 'vitest';
import {
  sanitizeStderr,
  formatDiagnosticsReport,
} from '../../src/common/errors';
import { DiagnosticsData } from '../../src/common/types';

describe('Error & Diagnostics Sanitization', () => {
  it('strips user home directories and usernames from stderr', () => {
    const raw =
      'Error opening /Users/johndoe/Desktop/AudioX/input.wav: file not found at /Users/johndoe/.config';
    const sanitized = sanitizeStderr(raw, '/Users/johndoe');

    expect(sanitized).not.toContain('johndoe');
    expect(sanitized).toContain('<user_home>');
  });

  it('strips windows user home paths', () => {
    const raw = 'Error loading C:\\Users\\Administrator\\Music\\secret.flac';
    const sanitized = sanitizeStderr(raw);

    expect(sanitized).not.toContain('Administrator');
    expect(sanitized).toContain('<user_home>');
  });

  it('strips temp directories and audio filenames', () => {
    const raw =
      'Failed in /tmp/audiox-job-1234/test_file.wav: Invalid sample format in "my_interview.wav"';
    const sanitized = sanitizeStderr(raw, undefined, '/tmp/audiox-job-1234');

    expect(sanitized).not.toContain('audiox-job-1234');
    expect(sanitized).not.toContain('my_interview.wav');
    expect(sanitized).toContain('<temp_dir>');
    expect(sanitized).toContain('<audio_file>');
  });

  it('formats clean diagnostics report without sensitive details', () => {
    const data: DiagnosticsData = {
      appVersion: '1.0.0',
      os: 'darwin',
      arch: 'arm64',
      deepFilterVersion: '0.5.6',
      ffmpegVersion: '6.1.1',
      stage: 'denoising',
      exitCode: 1,
      sanitizedStderr: 'Filtered error in <temp_dir>/<audio_file>',
    };

    const report = formatDiagnosticsReport(data);

    expect(report).toContain('=== AudioX Diagnostics ===');
    expect(report).toContain('App Version: 1.0.0');
    expect(report).toContain('OS: darwin (arm64)');
    expect(report).toContain('DeepFilterNet: 0.5.6');
    expect(report).toContain('Failure Stage: denoising');
    expect(report).toContain('Exit Code: 1');
    expect(report).toContain('Filtered error in <temp_dir>/<audio_file>');
  });
});
