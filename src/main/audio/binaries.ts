import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCurrentPlatformKey } from '../engine/manifest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface BinaryPaths {
  ffmpeg: string;
  ffprobe: string;
}

export function resolveBundledBinaries(resourcesPath?: string): BinaryPaths {
  const isWindows = process.platform === 'win32';
  const ffmpegExe = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  const ffprobeExe = isWindows ? 'ffprobe.exe' : 'ffprobe';

  const platformKey = getCurrentPlatformKey();

  // Search paths in order:
  // 1. Packaged resourcesPath/binaries/
  // 2. dev resources/binaries/<platformKey>/
  // 3. System PATH (fallback for dev)
  const candidateDirs: string[] = [];

  if (resourcesPath) {
    candidateDirs.push(
      path.join(resourcesPath, 'binaries'),
      path.join(resourcesPath, 'binaries', platformKey),
      path.join(resourcesPath, 'binaries', 'mac-arm64'),
      path.join(resourcesPath, 'binaries', 'darwin-arm64')
    );
  }

  candidateDirs.push(
    path.join(__dirname, '../../../resources/binaries', platformKey),
    path.join(__dirname, '../../../resources/binaries/mac-arm64'),
    path.join(__dirname, '../../resources/binaries', platformKey),
    path.join(__dirname, '../../resources/binaries/mac-arm64'),
    path.join(process.cwd(), 'resources/binaries', platformKey),
    path.join(process.cwd(), 'resources/binaries/mac-arm64')
  );

  let foundFfmpeg: string | null = null;
  let foundFfprobe: string | null = null;

  for (const dir of candidateDirs) {
    const fPath = path.join(dir, ffmpegExe);
    const pPath = path.join(dir, ffprobeExe);
    if (fs.existsSync(fPath) && !foundFfmpeg) {
      foundFfmpeg = fPath;
    }
    if (fs.existsSync(pPath) && !foundFfprobe) {
      foundFfprobe = pPath;
    }
  }

  // If ffprobe binary not found, fallback to ffmpeg (probeAudioFile supports ffmpeg -i)
  if (!foundFfprobe && foundFfmpeg) {
    foundFfprobe = foundFfmpeg;
  }

  // Fallback to system command if in development
  return {
    ffmpeg: foundFfmpeg || ffmpegExe,
    ffprobe: foundFfprobe || ffprobeExe,
  };
}
