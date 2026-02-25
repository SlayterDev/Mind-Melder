import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  screen,
  session,
  shell,
  systemPreferences,
} from 'electron';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
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
  });
}

function createRecordingWindow() {
  if (recordingWindow) {
    recordingWindow.show();
    recordingWindow.focus();
    return;
  }

  const windowWidth = 320;
  const windowHeight = 220;
  const inset = 20;
  const { workArea } = screen.getPrimaryDisplay();

  recordingWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: workArea.x + workArea.width - windowWidth - inset,
    y: workArea.y + inset,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#111827',
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
  mainWindow?.setFocusable(false);
  quickCaptureWindow?.close();
  setTimeout(() => {
    mainWindow?.setFocusable(true);
  }, 200);
});

ipcMain.handle('notify-capture-created', () => {
  // Notify main window that a capture was created
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('capture-created');
  }
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


ipcMain.handle('save-recording', async (_event, data: { buffer: Uint8Array; filename: string }) => {
  const recordingsDir = path.join(app.getPath('userData'), 'recordings');
  
  // Ensure recordings directory exists (async)
  try {
    await fs.access(recordingsDir);
  } catch {
    await fs.mkdir(recordingsDir, { recursive: true });
  }

  // Sanitize filename to prevent path traversal
  const requestedName = data.filename ?? '';
  const baseName = path.basename(requestedName);

  // Reject filenames with consecutive dots or path segments
  if (baseName === '.' || baseName === '..' || baseName.includes('..')) {
    throw new Error('Invalid recording filename');
  }

  // Allow only simple, safe filenames (alphanumeric, single dots, underscores, hyphens)
  if (!/^[a-zA-Z0-9._-]+$/.test(baseName)) {
    throw new Error('Invalid recording filename');
  }

  // Enforce .webm extension
  let safeFileName = baseName;
  if (path.extname(safeFileName).toLowerCase() !== '.webm') {
    safeFileName = `${safeFileName}.webm`;
  }

  const filePath = path.join(recordingsDir, safeFileName);
  
  // Write buffer directly without creating a copy (Buffer can accept Uint8Array)
  await fs.writeFile(filePath, data.buffer);
  
  return { path: filePath, size: data.buffer.length };
});

ipcMain.handle('get-recordings-path', () => {
  return path.join(app.getPath('userData'), 'recordings');
});

ipcMain.handle('open-recordings-folder', async () => {
  const recordingsDir = path.join(app.getPath('userData'), 'recordings');
  try {
    await fs.access(recordingsDir);
  } catch {
    await fs.mkdir(recordingsDir, { recursive: true });
  }
  await shell.openPath(recordingsDir);
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

ipcMain.handle('resize-recording-window', (_event, height: number) => {
  if (!recordingWindow) return;
  
  // Clamp height to reasonable bounds (min 220px, max 800px)
  const clampedHeight = Math.max(220, Math.min(800, Math.round(height)));
  
  const [width] = recordingWindow.getSize();
  recordingWindow.setSize(width, clampedHeight);
});

// App lifecycle
app.whenReady().then(() => {
  // Handle getDisplayMedia requests — provides screen source + system audio loopback
  // This enables native system audio capture via macOS ScreenCaptureKit
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 },
    });
    if (sources.length > 0) {
      callback({ video: sources[0], audio: 'loopback' });
    } else {
      callback({});
    }
  });

  // Approve all Chromium-level permission checks and requests.
  // The app only loads its own bundled content, so macOS TCC is the real
  // authorization boundary. Without these handlers Chromium maintains
  // session-scoped permission state that doesn't persist across launches.
  session.defaultSession.setPermissionCheckHandler(() => true);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true);
  });

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
