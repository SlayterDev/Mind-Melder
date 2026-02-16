import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeQuickCapture: () => ipcRenderer.invoke('close-quick-capture'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,

  // Capture notifications
  notifyCaptureCreated: () => ipcRenderer.invoke('notify-capture-created'),
  onCaptureCreated: (callback: () => void) => {
    const subscription = (_event: any) => callback();
    ipcRenderer.on('capture-created', subscription);
    return () => ipcRenderer.removeListener('capture-created', subscription);
  },

  // Recording
  checkAudioPermissions: () => ipcRenderer.invoke('check-audio-permissions'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  saveRecording: (data: { buffer: Uint8Array; filename: string }) =>
    ipcRenderer.invoke('save-recording', data),
  getRecordingsPath: () => ipcRenderer.invoke('get-recordings-path'),
  openSystemPreferences: (pane: string) => ipcRenderer.invoke('open-system-preferences', pane),
  openRecordingWindow: () => ipcRenderer.invoke('open-recording-window'),
  closeRecordingWindow: () => ipcRenderer.invoke('close-recording-window'),
  resizeRecordingWindow: (height: number) =>
    ipcRenderer.invoke('resize-recording-window', height),

  // Notifications
  checkNotifications: () => ipcRenderer.invoke('check-notifications'),
  clearNotificationState: (todoId: string) => 
    ipcRenderer.invoke('clear-notification-state', todoId),
  restartNotificationService: () => ipcRenderer.invoke('restart-notification-service'),
  getNotificationState: () => ipcRenderer.invoke('get-notification-state'),
  onNavigateToTodo: (callback: (todoId: string) => void) => {
    const subscription = (_event: any, todoId: string) => callback(todoId);
    ipcRenderer.on('navigate-to-todo', subscription);
    return () => ipcRenderer.removeListener('navigate-to-todo', subscription);
  },
});

