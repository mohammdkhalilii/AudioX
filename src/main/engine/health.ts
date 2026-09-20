import { spawn } from 'node:child_process';
import { ErrorCodes } from '../../common/errors.js';

export interface HealthCheckResult {
  ok: boolean;
  version?: string;
  error?: string;
}

export async function verifyEngineHealth(
  executablePath: string
): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    try {
      const child = spawn(executablePath, ['--version'], {
        shell: false,
        timeout: 10000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('error', (err) => {
        resolve({
          ok: false,
          error: `Failed to execute engine: ${err.message}`,
        });
      });

      child.on('close', (code) => {
        if (code === 0) {
          const version = stdout.trim() || 'deep-filter';
          resolve({ ok: true, version });
        } else {
          resolve({
            ok: false,
            error: `Engine check exited with code ${code}: ${stderr.trim()}`,
          });
        }
      });
    } catch (err: any) {
      resolve({
        ok: false,
        error: `Unexpected error starting engine: ${err?.message || String(err)}`,
      });
    }
  });
}
