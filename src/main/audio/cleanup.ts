import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const PREFIX = 'audiox-job-';

export function createJobTempDirectory(jobId: string): string {
  const tempBase = os.tmpdir();
  const jobDir = path.join(tempBase, `${PREFIX}${jobId}`);
  fs.mkdirSync(jobDir, { recursive: true });
  return jobDir;
}

export function cleanupJobDirectory(jobDir: string): void {
  if (!jobDir) return;
  try {
    if (fs.existsSync(jobDir)) {
      fs.rmSync(jobDir, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup failures
  }
}

export function sweepStaleTempDirectories(): void {
  try {
    const tempBase = os.tmpdir();
    const entries = fs.readdirSync(tempBase);
    for (const entry of entries) {
      if (entry.startsWith(PREFIX)) {
        const fullPath = path.join(tempBase, entry);
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } catch {
          // ignore busy folders
        }
      }
    }
  } catch {
    // ignore
  }
}
