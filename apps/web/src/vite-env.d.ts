/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ElectronAPI {
  closeQuickCapture: () => Promise<void>;
  getPlatform: () => Promise<string>;
  isElectron: boolean;
}

interface Window {
  electronAPI?: ElectronAPI;
}
