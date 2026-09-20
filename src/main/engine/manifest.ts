import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EngineManifest, EngineManifestEntry } from '../../common/types.js';
import { ErrorCodes } from '../../common/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getManifestPath(resourcesPath?: string): string {
  const resPath = resourcesPath || (typeof process !== 'undefined' ? process.resourcesPath : undefined);
  const candidates = [
    resPath ? path.join(resPath, 'engine-manifest.json') : null,
    resPath ? path.join(resPath, 'resources/engine-manifest.json') : null,
    path.join(__dirname, '../../resources/engine-manifest.json'),
    path.join(__dirname, '../../../resources/engine-manifest.json'),
    path.join(process.cwd(), 'resources/engine-manifest.json'),
    path.join(process.cwd(), 'engine-manifest.json'),
  ].filter((p): p is string => typeof p === 'string');

  const possiblePaths = candidates.filter((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  if (possiblePaths.length === 0) {
    throw new Error(`Engine manifest file not found. Searched: ${candidates.join(', ')}`);
  }

  return possiblePaths[0];
}

export function loadEngineManifest(customPath?: string): EngineManifest {
  let filePath: string;
  if (customPath && fs.existsSync(customPath)) {
    try {
      if (fs.statSync(customPath).isDirectory()) {
        filePath = getManifestPath(customPath);
      } else {
        filePath = customPath;
      }
    } catch {
      filePath = getManifestPath();
    }
  } else {
    filePath = getManifestPath();
  }

  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData) as EngineManifest;
}

export function getCurrentPlatformKey(
  platform = process.platform,
  arch = process.arch
): string {
  return `${platform}-${arch}`;
}

export function getEngineManifestForPlatform(
  manifest: EngineManifest,
  platform = process.platform,
  arch = process.arch
): EngineManifestEntry {
  const key = getCurrentPlatformKey(platform, arch);
  const entry = manifest.platforms[key];

  if (!entry) {
    const err = new Error(
      `Unsupported platform: ${platform} ${arch}. AudioX v1 supports macOS Apple Silicon (arm64), Windows x64, and Linux x64.`
    );
    err.name = ErrorCodes.UNSUPPORTED_PLATFORM;
    throw err;
  }

  return entry;
}
