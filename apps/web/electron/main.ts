import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let quickCaptureWindow: BrowserWindow | null = null;

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
