import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  shell,
  systemPreferences,
} from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let quickCaptureWindow: BrowserWindow | null = null;
let recordingWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createQuickCaptureWindow() {
  if (quickCaptureWindow) {
    quickCaptureWindow.focus();
    return;
  }

  quickCaptureWindow = new BrowserWindow({
    width: 800,
    height: 160,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1f2937',
    titleBarStyle: 'hidden',
    show: false, // Don't show until ready
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Center on screen
  quickCaptureWindow.center();

  const url = isDev
    ? 'http://localhost:5173/#/quick-capture'
    : `file://${path.join(__dirname, '../dist/index.html')}#/quick-capture`;

  quickCaptureWindow.loadURL(url);

  // Show window only after content is ready to avoid flicker
  quickCaptureWindow.once('ready-to-show', () => {
    quickCaptureWindow?.show();
    quickCaptureWindow?.focus();
  });

  quickCaptureWindow.on('blur', () => {
    quickCaptureWindow?.close();
  });

  quickCaptureWindow.on('closed', () => {
    quickCaptureWindow = null;
    // Hide the app to return focus to the previously active application
    if (process.platform === 'darwin') {
      app.hide();
    }
  });
}

function createRecordingWindow() {
  if (recordingWindow) {
    recordingWindow.show();
    recordingWindow.focus();
    return;
  }

  recordingWindow = new BrowserWindow({
    width: 320,
    height: 220,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1f2937',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const url = isDev
    ? 'http://localhost:5173/#/recording'
    : `file://${path.join(__dirname, '../dist/index.html')}#/recording`;

  recordingWindow.loadURL(url);

  recordingWindow.once('ready-to-show', () => {
    recordingWindow?.show();
    recordingWindow?.focus();
  });

  recordingWindow.on('closed', () => {
    recordingWindow = null;
  });
}

function registerGlobalShortcuts() {
  // Register Cmd+Shift+C (macOS) / Ctrl+Shift+C (Windows/Linux)
  const shortcut = process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';

  const registered = globalShortcut.register(shortcut, () => {
    createQuickCaptureWindow();
  });

  if (!registered) {
    console.error('Failed to register global shortcut:', shortcut);
  }
}

// IPC handlers
ipcMain.handle('close-quick-capture', () => {
  quickCaptureWindow?.close();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

// Recording IPC handlers
ipcMain.handle('check-audio-permissions', () => {
  if (process.platform === 'darwin') {
    return {
      microphone: systemPreferences.getMediaAccessStatus('microphone'),
      screen: systemPreferences.getMediaAccessStatus('screen'),
    };
  }
  // Windows/Linux don't have the same permission model
  return { microphone: 'granted', screen: 'granted' };
});

ipcMain.handle('request-microphone-permission', async () => {
  if (process.platform === 'darwin') {
    return await systemPreferences.askForMediaAccess('microphone');
  }
  return true;
});

ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 0, height: 0 },
  });
  return sources.map((s) => ({ id: s.id, name: s.name }));
});

ipcMain.handle('save-recording', async (_event, data: { buffer: string; filename: string }) => {
  const recordingsDir = path.join(app.getPath('userData'), 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
  const filePath = path.join(recordingsDir, data.filename);
  const buffer = Buffer.from(data.buffer, 'base64');
  fs.writeFileSync(filePath, buffer);
  return { path: filePath, size: buffer.length };
});

ipcMain.handle('get-recordings-path', () => {
  return path.join(app.getPath('userData'), 'recordings');
});

ipcMain.handle('open-system-preferences', (_event, pane: string) => {
  if (process.platform === 'darwin') {
    const paneMap: Record<string, string> = {
      microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      screen: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    };
    const url = paneMap[pane];
    if (url) {
      shell.openExternal(url);
    }
  }
});

ipcMain.handle('open-recording-window', () => {
  createRecordingWindow();
});

ipcMain.handle('close-recording-window', () => {
  recordingWindow?.close();
});

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
