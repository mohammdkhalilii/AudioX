import { describe, it, expect } from 'vitest';
import {
  getCurrentPlatformKey,
  getEngineManifestForPlatform,
} from '../../src/main/engine/manifest';
import { EngineManifest } from '../../src/common/types';
import { ErrorCodes } from '../../src/common/errors';

const mockManifest: EngineManifest = {
  version: '0.5.6',
  platforms: {
    'darwin-arm64': {
      version: '0.5.6',
      url: 'https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-aarch64-apple-darwin',
      expectedSize: 28416480,
      sha256: '4b971e467cf7564d6fb350d75a40eef911a3b53c5eefb942d997232dcae0f214',
      filename: 'deep-filter',
    },
    'win32-x64': {
      version: '0.5.6',
      url: 'https://github.com/Rikorose/DeepFilterNet/releases/download/v0.5.6/deep-filter-0.5.6-x86_64-pc-windows-msvc.exe',
      expectedSize: 29845504,
      sha256: '75e11fa16445f560cb6b021521ddb89e89270d13b83089705d98776f58fd7915',
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

describe('Engine Manifest Resolution', () => {
  it('generates correct platform key format', () => {
    expect(getCurrentPlatformKey('darwin', 'arm64')).toBe('darwin-arm64');
    expect(getCurrentPlatformKey('win32', 'x64')).toBe('win32-x64');
    expect(getCurrentPlatformKey('linux', 'x64')).toBe('linux-x64');
  });

  it('retrieves valid manifest entry for supported platforms', () => {
    const macEntry = getEngineManifestForPlatform(mockManifest, 'darwin', 'arm64');
    expect(macEntry.filename).toBe('deep-filter');
    expect(macEntry.sha256).toBe('4b971e467cf7564d6fb350d75a40eef911a3b53c5eefb942d997232dcae0f214');

    const winEntry = getEngineManifestForPlatform(mockManifest, 'win32', 'x64');
    expect(winEntry.filename).toBe('deep-filter.exe');

    const linuxEntry = getEngineManifestForPlatform(mockManifest, 'linux', 'x64');
    expect(linuxEntry.filename).toBe('deep-filter');
  });

  it('throws UNSUPPORTED_PLATFORM error for unsupported architecture', () => {
    expect(() =>
      getEngineManifestForPlatform(mockManifest, 'darwin', 'x64')
    ).toThrowError(/Unsupported platform/);

    try {
      getEngineManifestForPlatform(mockManifest, 'darwin', 'x64');
    } catch (err: any) {
      expect(err.name).toBe(ErrorCodes.UNSUPPORTED_PLATFORM);
    }
  });

  it('throws UNSUPPORTED_PLATFORM error for unsupported OS', () => {
    expect(() =>
      getEngineManifestForPlatform(mockManifest, 'freebsd' as any, 'x64')
    ).toThrowError();
  });
});
