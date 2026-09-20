import { spawn, ChildProcess } from 'node:child_process';
import { ErrorCodes } from '../../common/errors.js';

export interface RunProcessOptions {
  executable: string;
  args: string[];
  cwd?: string;
  signal?: AbortSignal;
  onStderrLine?: (line: string) => void;
  onStdoutLine?: (line: string) => void;
}

export interface RunProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export async function runProcess(
  options: RunProcessOptions
): Promise<RunProcessResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess | null = null;

    try {
      child = spawn(options.executable, options.args, {
        cwd: options.cwd,
        shell: false,
        windowsHide: true,
      });
    } catch (err: any) {
      const error = new Error(`Failed to spawn ${options.executable}: ${err.message}`);
      error.name = ErrorCodes.PROCESS_FAILED;
      return reject(error);
    }

    let stdout = '';
    let stderr = '';
    const maxBuffer = 1024 * 1024; // 1 MB capped in memory

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (stdout.length < maxBuffer) {
        stdout += text;
      }
      if (options.onStdoutLine) {
        text.split('\n').forEach((line) => {
          if (line.trim()) options.onStdoutLine!(line);
        });
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      if (stderr.length < maxBuffer) {
        stderr += text;
      }
      if (options.onStderrLine) {
        text.split('\n').forEach((line) => {
          if (line.trim()) options.onStderrLine!(line);
        });
      }
    });

    let aborted = false;

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        aborted = true;
        if (child && !child.killed) {
          try {
            // Send SIGTERM, then SIGKILL if it doesn't exit
            child.kill('SIGTERM');
            setTimeout(() => {
              if (child && !child.killed) {
                child.kill('SIGKILL');
              }
            }, 1000);
          } catch {
            // ignore
          }
        }
      });
    }

    child.on('error', (err) => {
      const error = new Error(`Process error: ${err.message}`);
      error.name = ErrorCodes.PROCESS_FAILED;
      reject(error);
    });

    child.on('close', (code) => {
      if (aborted) {
        const error = new Error('Process cancelled by user');
        error.name = ErrorCodes.PROCESS_CANCELLED;
        return reject(error);
      }

      if (code === 0) {
        resolve({
          exitCode: 0,
          stdout,
          stderr,
        });
      } else {
        const error = new Error(
          `Process ${options.executable} exited with code ${code}`
        );
        error.name = ErrorCodes.PROCESS_FAILED;
        (error as any).exitCode = code;
        (error as any).stderr = stderr;
        reject(error);
      }
    });
  });
}
