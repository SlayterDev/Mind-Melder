const API_URL_KEY = 'mindmelder_api_url';
const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

export function getApiUrl(): string {
  // In Electron, check localStorage first
  if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
    const stored = localStorage.getItem(API_URL_KEY);
    if (stored) {
      return stored;
    }
  }

  // Fall back to env variable or default
  return import.meta.env.VITE_API_URL || '/api/v1';
}

export function setApiUrl(url: string): void {
  // Normalize: ensure it ends with /api/v1
  let normalized = url.trim();
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized.endsWith('/api/v1')) {
    normalized = normalized + '/api/v1';
  }
  localStorage.setItem(API_URL_KEY, normalized);
}

export function isApiConfigured(): boolean {
  // In web mode, always configured via proxy
  if (typeof window === 'undefined' || !window.electronAPI?.isElectron) {
    return true;
  }
  return localStorage.getItem(API_URL_KEY) !== null;
}

export function getServerUrl(): string {
  const apiUrl = getApiUrl();
  // Remove /api/v1 suffix to get base server URL
  return apiUrl.replace(/\/api\/v1$/, '');
}

export async function testConnection(serverUrl: string): Promise<boolean> {
  try {
    const url = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const response = await fetch(`${url}/api/v1/settings`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}
