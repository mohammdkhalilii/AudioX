import { BrowserWindow, session, shell } from 'electron';
import { AUDIO_PROTOCOL_SCHEME } from '../common/constants.js';

const ALLOWED_EXTERNAL_URLS = new Set([
  'https://github.com/Rikorose/DeepFilterNet',
  'https://ffmpeg.org',
  'https://ffmpeg.org/legal.html',
  'https://github.com',
]);

export function configureWindowSecurity(mainWindow: BrowserWindow): void {
  // Prevent any in-app navigation away from our local content
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
  });

  // Intercept window.open / popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && ALLOWED_EXTERNAL_URLS.has(parsed.origin)) {
        shell.openExternal(url);
      }
    } catch {
      // ignore
    }
    return { action: 'deny' };
  });

  // Set restrictive CSP on all responses
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = [
      "default-src 'self' file: data: app-audio:",
      "script-src 'self' 'unsafe-inline' file:",
      "style-src 'self' 'unsafe-inline'",
      `media-src 'self' file: ${AUDIO_PROTOCOL_SCHEME}:`,
      `connect-src 'self' file: ${AUDIO_PROTOCOL_SCHEME}:`,
      "img-src 'self' file: data:",
      "font-src 'self' file:",
    ].join('; ');

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Allow clipboard permissions, deny all other permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'clipboard-sanitized-write' || permission === 'clipboard-read') {
      callback(true);
      return;
    }
    callback(false);
  });
}
