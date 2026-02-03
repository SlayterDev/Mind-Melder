import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeQuickCapture: () => ipcRenderer.invoke('close-quick-capture'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,
});
