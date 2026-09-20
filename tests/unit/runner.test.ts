import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCurrentPlatformKey,
  getEngineManifestForPlatform,
  loadEngineManifest,
} from '../../dist/main/engine/manifest.js';
import type { EngineManifest, DiagnosticsData } from '../../dist/common/types.js';
import { ErrorCodes, ErrorMessages } from '../../dist/common/errors.js';
import { computeTargetLufs } from '../../dist/main/audio/pipeline.js';
import {
  AUDIO_CONSTRAINTS,
  estimateRequiredTempBytes,
  OUTPUT_FORMAT_CONFIG,
  SUPPORTED_EXTENSIONS,
} from '../../dist/common/constants.js';
import { TokenRegistry } from '../../dist/main/tokens.js';
import {
  sanitizeStderr,
  formatDiagnosticsReport,
} from '../../dist/common/errors.js';
import { resolveBundledBinaries } from '../../dist/main/audio/binaries.js';
import { isAllowedDownloadHost } from '../../dist/main/engine/downloader.js';

const mockManifest: EngineManifest = {
  version: '0.5.6',
  platforms: {
    'darwin-arm64': {
      version: '0.5.6',
      url: 'https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-aarch64-apple-darwin',
      expectedSize: 28416480,
      sha256: '4601e7f4e4c03e59a4c5b5000216ef3add3e808799cfccd95e14e83ea4611081',
      filename: 'deep-filter',
    },
    'win32-x64': {
      version: '0.5.6',
      url: 'https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-x86_64-pc-windows-msvc.exe',
      expectedSize: 29845504,
      sha256: '9a1bf72863ad92a6c8e317d740eb140dd1dfad3cb32b2e0436cebb77f5255ee8',
      filename: 'deep-filter.exe',
    },
    'linux-x64': {
      version: '0.5.6',
      url: 'https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-x86_64-unknown-linux-gnu',
      expectedSize: 31254816,
      sha256: '786411ab194e8a8b13ce82df5846e917d05719be642a84a6946bf8e147de9520',
      filename: 'deep-filter',
    },
  },
};

test('Manifest Resolution & Platform Detection', () => {
  assert.equal(getCurrentPlatformKey('darwin', 'arm64'), 'darwin-arm64');
  assert.equal(getCurrentPlatformKey('win32', 'x64'), 'win32-x64');
  assert.equal(getCurrentPlatformKey('linux', 'x64'), 'linux-x64');

  const macEntry = getEngineManifestForPlatform(mockManifest, 'darwin', 'arm64');
  assert.equal(macEntry.filename, 'deep-filter');
  assert.equal(
    macEntry.sha256,
    '4601e7f4e4c03e59a4c5b5000216ef3add3e808799cfccd95e14e83ea4611081'
  );

  assert.throws(() => {
    getEngineManifestForPlatform(mockManifest, 'darwin', 'x64');
  }, (err: any) => err.name === ErrorCodes.UNSUPPORTED_PLATFORM);
});

test('loadEngineManifest accepts directory or resources path without EISDIR', () => {
  // Test passing a directory (like resourcesPath)
  const manifestFromDir = loadEngineManifest(process.cwd());
  assert.equal(manifestFromDir.version, '0.5.6');
  assert(manifestFromDir.platforms['darwin-arm64']);

  // Test default no-arg
  const manifestDefault = loadEngineManifest();
  assert.equal(manifestDefault.version, '0.5.6');
});

test('Target LUFS computation', () => {
  assert.equal(computeTargetLufs({ mode: 'natural' }), -18);
  assert.equal(computeTargetLufs({ mode: 'loud' }), -16);
  assert.equal(computeTargetLufs({ mode: 'custom', customLufs: -20 }), -20);
  assert.equal(computeTargetLufs({ mode: 'custom', customLufs: -30 }), AUDIO_CONSTRAINTS.LUFS_CUSTOM_MIN);
  assert.equal(computeTargetLufs({ mode: 'custom', customLufs: -5 }), AUDIO_CONSTRAINTS.LUFS_CUSTOM_MAX);
});

test('Temp space estimation', () => {
  const est = estimateRequiredTempBytes(10);
  assert(est > 100 * 1024 * 1024);
  assert.equal(est, 10 * 48000 * 16 + 100 * 1024 * 1024);
});

test('TokenRegistry lifecycle', () => {
  const reg = new TokenRegistry();
  const token = reg.register('/path/to/test.wav', 'job-1');
  assert.equal(reg.resolve(token), '/path/to/test.wav');

  reg.revokeJobTokens('job-1');
  assert.equal(reg.resolve(token), null);
});

test('Sanitization of sensitive stderr details', () => {
  const raw = 'Error in /Users/johndoe/project/file.wav: cannot open "interview.mp3"';
  const clean = sanitizeStderr(raw, '/Users/johndoe');
  assert(!clean.includes('johndoe'));
  assert(clean.includes('<user_home>'));
  assert(clean.includes('<audio_file>'));
});

test('Diagnostics formatting report', () => {
  const diag: DiagnosticsData = {
    appVersion: '1.0.0',
    os: 'darwin',
    arch: 'arm64',
    deepFilterVersion: '0.5.6',
    stage: 'denoising',
    exitCode: 1,
    sanitizedStderr: 'Filtered error text',
  };
  const report = formatDiagnosticsReport(diag);
  assert(report.includes('App Version: 1.0.0'));
  assert(report.includes('DeepFilterNet: 0.5.6'));
  assert(report.includes('Filtered error text'));
});

test('Audio formats and error definitions', () => {
  assert.equal(SUPPORTED_EXTENSIONS.length, 4);
  assert(SUPPORTED_EXTENSIONS.includes('.wav'));
  assert(SUPPORTED_EXTENSIONS.includes('.m4a'));
  assert(SUPPORTED_EXTENSIONS.includes('.mp3'));
  assert(SUPPORTED_EXTENSIONS.includes('.flac'));

  assert.equal(OUTPUT_FORMAT_CONFIG.wav.extension, '.wav');
  assert.equal(OUTPUT_FORMAT_CONFIG.m4a.extension, '.m4a');
  assert.equal(OUTPUT_FORMAT_CONFIG.mp3.extension, '.mp3');
  assert.equal(OUTPUT_FORMAT_CONFIG.flac.extension, '.flac');

  for (const code of Object.values(ErrorCodes)) {
    assert(ErrorMessages[code], `Missing error message for code ${code}`);
  }
});

test('Binary resolution fallback', () => {
  const bins = resolveBundledBinaries();
  assert(bins.ffmpeg);
  assert(bins.ffprobe);
});

test('Download host allowlist', () => {
  assert(isAllowedDownloadHost('github.com'));
  assert(isAllowedDownloadHost('raw.githubusercontent.com'));
  assert(isAllowedDownloadHost('objects.githubusercontent.com'));
  assert(isAllowedDownloadHost('release-assets.githubusercontent.com'));
  assert(isAllowedDownloadHost('github-releases.githubusercontent.com'));

  assert(!isAllowedDownloadHost('evil.com'));
  assert(!isAllowedDownloadHost('github.com.evil.com'));
  assert(!isAllowedDownloadHost('malicious-site.net'));
});

