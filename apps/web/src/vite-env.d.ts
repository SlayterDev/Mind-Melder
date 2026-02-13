/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface AudioPermissionStatus {
  microphone: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
  screen: 'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown';
}

interface SaveRecordingResult {
  path: string;
  size: number;
}

interface ElectronAPI {
  closeQuickCapture: () => Promise<void>;
  getPlatform: () => Promise<string>;
  isElectron: boolean;

  // Capture notifications
  notifyCaptureCreated: () => Promise<void>;
  onCaptureCreated: (callback: () => void) => () => void;

  // Recording
  checkAudioPermissions: () => Promise<AudioPermissionStatus>;
  requestMicrophonePermission: () => Promise<boolean>;
  saveRecording: (data: { buffer: Uint8Array; filename: string }) => Promise<SaveRecordingResult>;
  getRecordingsPath: () => Promise<string>;
  openSystemPreferences: (pane: string) => Promise<void>;
  openRecordingWindow: () => Promise<void>;
  closeRecordingWindow: () => Promise<void>;
  resizeRecordingWindow: (height: number) => Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
