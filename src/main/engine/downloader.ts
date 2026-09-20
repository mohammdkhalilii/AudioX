import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import type { EngineManifestEntry } from '../../common/types.js';
import { ErrorCodes } from '../../common/errors.js';

export function isAllowedDownloadHost(hostname: string): boolean {
  return (
    hostname === 'github.com' ||
    hostname.endsWith('.github.com') ||
    hostname === 'githubusercontent.com' ||
    hostname.endsWith('.githubusercontent.com')
  );
}

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
}

export interface EngineDownloaderOptions {
  engineDir: string;
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
}

export function getEngineBinaryPath(
  engineDir: string,
  entry: EngineManifestEntry
): string {
  return path.join(engineDir, entry.version, entry.filename);
}

export async function downloadEngineBinary(
  entry: EngineManifestEntry,
  options: EngineDownloaderOptions
): Promise<string> {
  const versionDir = path.join(options.engineDir, entry.version);
  fs.mkdirSync(versionDir, { recursive: true });

  const finalPath = path.join(versionDir, entry.filename);
  const tmpPath = path.join(versionDir, `${entry.filename}.${Date.now()}.tmp`);

  // If already exists and matches expected size & hash, return it directly
  if (fs.existsSync(finalPath)) {
    const existingHash = await calculateFileSha256(finalPath);
    if (existingHash === entry.sha256) {
      return finalPath;
    }
    // Corrupt or old file, remove it
    try {
      fs.unlinkSync(finalPath);
    } catch {
      // ignore
    }
  }

  try {
    await downloadFileWithVerify(entry.url, tmpPath, entry, options);
    // Atomic rename
    fs.renameSync(tmpPath, finalPath);

    // Make executable on unix
    if (process.platform !== 'win32') {
      fs.chmodSync(finalPath, 0o755);
    }

    return finalPath;
  } catch (err) {
    // Delete tmp file if exists
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

export async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function downloadFileWithVerify(
  initialUrl: string,
  destPath: string,
  entry: EngineManifestEntry,
  options: EngineDownloaderOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    let currentUrl = initialUrl;
    let redirects = 0;
    const maxRedirects = 10;

    const fileStream = fs.createWriteStream(destPath);
    const hash = crypto.createHash('sha256');
    let bytesDownloaded = 0;

    const cleanup = () => {
      fileStream.close();
    };

    const doRequest = (targetUrl: string) => {
      if (options.signal?.aborted) {
        cleanup();
        const err = new Error('Download aborted by user');
        err.name = ErrorCodes.PROCESS_CANCELLED;
        return reject(err);
      }

      const parsedUrl = new URL(targetUrl);
      if (!isAllowedDownloadHost(parsedUrl.hostname)) {
        cleanup();
        const err = new Error(`Untrusted download host: ${parsedUrl.hostname}`);
        err.name = ErrorCodes.ENGINE_DOWNLOAD_FAILED;
        return reject(err);
      }

      const req = https.get(targetUrl, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          redirects++;
          if (redirects > maxRedirects) {
            cleanup();
            const err = new Error('Too many redirects');
            err.name = ErrorCodes.ENGINE_DOWNLOAD_FAILED;
            return reject(err);
          }
          const nextUrl = new URL(res.headers.location, targetUrl).toString();
          return doRequest(nextUrl);
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          cleanup();
          const err = new Error(
            `HTTP ${res.statusCode} failed to download engine`
          );
          err.name = ErrorCodes.ENGINE_DOWNLOAD_FAILED;
          return reject(err);
        }

        const totalBytes =
          parseInt(res.headers['content-length'] || '0', 10) ||
          entry.expectedSize;

        res.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length;
          hash.update(chunk);
          if (options.onProgress) {
            options.onProgress({ bytesDownloaded, totalBytes });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(async () => {
            const computedHash = hash.digest('hex');
            if (
              computedHash.toLowerCase() !== entry.sha256.toLowerCase()
            ) {
              const err = new Error(
                `Checksum mismatch: expected ${entry.sha256}, got ${computedHash}`
              );
              err.name = ErrorCodes.ENGINE_CHECKSUM_MISMATCH;
              return reject(err);
            }
            resolve();
          });
        });

        res.on('error', (err) => {
          cleanup();
          reject(err);
        });
      });

      req.on('error', (err) => {
        cleanup();
        const error = new Error(`Network error during engine download: ${err.message}`);
        error.name = ErrorCodes.ENGINE_DOWNLOAD_FAILED;
        reject(error);
      });

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy();
          cleanup();
          const err = new Error('Download aborted by user');
          err.name = ErrorCodes.PROCESS_CANCELLED;
          reject(err);
        });
      }
    };

    doRequest(currentUrl);
  });
}
