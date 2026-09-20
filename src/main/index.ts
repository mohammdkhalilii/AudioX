import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerPrivilegedSchemes, setupAudioProtocol } from './protocol.js';
import { configureWindowSecurity } from './security.js';
import { globalTokenRegistry } from './tokens.js';
import { registerIpcHandlers } from './ipc/handlers.js';
import { sweepStaleTempDirectories } from './audio/cleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register scheme before app is ready
registerPrivilegedSchemes();

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 720,
    minWidth: 700,
    minHeight: 580,
    title: 'AudioX',
    backgroundColor: '#121214',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer log] ${message} (${sourceId}:${line})`);
  });

  configureWindowSecurity(mainWindow);
  setupAudioProtocol(globalTokenRegistry);
  registerIpcHandlers(mainWindow, globalTokenRegistry);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  sweepStaleTempDirectories();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
