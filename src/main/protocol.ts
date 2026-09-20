import { protocol } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { AUDIO_PROTOCOL_SCHEME } from '../common/constants.js';
import { TokenRegistry } from './tokens.js';

export function registerPrivilegedSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: AUDIO_PROTOCOL_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        stream: true,
        supportFetchAPI: true,
        bypassCSP: false,
      },
    },
  ]);
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.m4a':
    case '.mp4':
    case '.aac':
      return 'audio/mp4';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.flac':
      return 'audio/flac';
    default:
      return 'application/octet-stream';
  }
}

export function setupAudioProtocol(registry: TokenRegistry): void {
  protocol.handle(AUDIO_PROTOCOL_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      // Format is app-audio://<token> or app-audio://token
      const token = url.hostname || url.pathname.replace(/^\/+/, '');

      if (!token) {
        return new Response('Missing token', { status: 400 });
      }

      const filePath = registry.resolve(token);
      if (!filePath || !fs.existsSync(filePath)) {
        return new Response('Audio file not found or expired', { status: 404 });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const mimeType = getMimeType(filePath);

      const rangeHeader = request.headers.get('Range');
      if (rangeHeader) {
        // Parse range: bytes=start-end
        const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

          if (start >= fileSize || end >= fileSize || start > end) {
            return new Response('Requested range not satisfiable', {
              status: 416,
              headers: { 'Content-Range': `bytes */${fileSize}` },
            });
          }

          const chunkSize = end - start + 1;
          const nodeStream = fs.createReadStream(filePath, { start, end });
          const readableStream = new ReadableStream({
            start(controller) {
              nodeStream.on('data', (chunk) => controller.enqueue(chunk));
              nodeStream.on('end', () => controller.close());
              nodeStream.on('error', (err) => controller.error(err));
            },
            cancel() {
              nodeStream.destroy();
            },
          });

          return new Response(readableStream, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': mimeType,
            },
          });
        }
      }

      // Full file stream
      const nodeStream = fs.createReadStream(filePath);
      const readableStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => controller.enqueue(chunk));
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });

      return new Response(readableStream, {
        status: 200,
        headers: {
          'Content-Length': String(fileSize),
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        },
      });
    } catch (err: any) {
      return new Response(`Protocol error: ${err.message}`, { status: 500 });
    }
  });
}
