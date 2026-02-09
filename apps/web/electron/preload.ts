import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeQuickCapture: () => ipcRenderer.invoke('close-quick-capture'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,

  // Recording
  checkAudioPermissions: () => ipcRenderer.invoke('check-audio-permissions'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  saveRecording: (data: { buffer: string; filename: string }) =>
    ipcRenderer.invoke('save-recording', data),
  getRecordingsPath: () => ipcRenderer.invoke('get-recordings-path'),
  openSystemPreferences: (pane: string) => ipcRenderer.invoke('open-system-preferences', pane),
  openRecordingWindow: () => ipcRenderer.invoke('open-recording-window'),
  closeRecordingWindow: () => ipcRenderer.invoke('close-recording-window'),
});
