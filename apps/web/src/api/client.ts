import { getApiUrl } from './config';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content or empty responses
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  // Check if there's actually content to parse
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text);
}

// Captures
export const capturesAPI = {
  list: () => fetchAPI<any[]>('/captures'),
  listUnorganized: () => fetchAPI<any[]>('/captures/unorganized'),
  get: (id: string) => fetchAPI<any>(`/captures/${id}`),
  create: (data: { content: string; metadata?: Record<string, unknown> }) =>
    fetchAPI('/captures', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/captures/${id}`, { method: 'DELETE' }),
};

// Todos
export type TimeEstimate = 'quick' | 'medium' | 'long' | 'none';

export const todosAPI = {
  list: (status?: 'pending' | 'completed') =>
    fetchAPI<any[]>(`/todos${status ? `?status=${status}` : ''}`),
  create: (data: { content: string; dueDate?: string }) =>
    fetchAPI('/todos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { content?: string; status?: string; dueDate?: string | null; description?: string; timeEstimate?: TimeEstimate }) =>
    fetchAPI(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  markComplete: (id: string) => fetchAPI(`/todos/${id}/complete`, { method: 'PATCH' }),
  submitFeedback: (id: string, data: { vote: 'thumbs_up' | 'thumbs_down' | 'none'; feedbackText?: string }) =>
    fetchAPI<any>(`/todos/${id}/feedback`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/todos/${id}`, { method: 'DELETE' }),
};

// Organized Notes
export const notesAPI = {
  list: (tag?: string) =>
    fetchAPI<any[]>(`/notes${tag ? `?tag=${tag}` : ''}`),
  get: (id: string) => fetchAPI<any>(`/notes/${id}`),
  create: (data: { title: string; content: string; tags?: string[] }) =>
    fetchAPI('/notes', { method: 'POST', body: JSON.stringify(data) }),
  append: (data: {title: string, contentToAppend: string}) =>
    fetchAPI('/notes/append', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    fetchAPI(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/notes/${id}`, { method: 'DELETE' }),
};

// Templates
export const templatesAPI = {
  list: () => fetchAPI<any[]>('/templates'),
  listActive: () => fetchAPI<any[]>('/templates/active'),
  create: (data: { name: string; prompt: string }) =>
    fetchAPI('/templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; prompt?: string; isActive?: boolean }) =>
    fetchAPI(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/templates/${id}`, { method: 'DELETE' }),
};

// Tags
export interface Tag {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const tagsAPI = {
  list: () => fetchAPI<Tag[]>('/tags'),
  create: (data: { name: string; description?: string }) =>
    fetchAPI<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    fetchAPI<Tag>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/tags/${id}`, { method: 'DELETE' }),
};

// Organization
export const organizeAPI = {
  trigger: (templateId?: string) =>
    fetchAPI<{ success: boolean; result: any; message: string }>(
      '/organize',
      { method: 'POST', body: templateId ? JSON.stringify({ templateId }) : undefined }
    ),
};

// Today Sheet
export const todaySheetAPI = {
  generate: (templateId?: string) =>
    fetchAPI<{ success: boolean; sheet: any; message: string }>(
      '/today-sheet/generate',
      { method: 'POST', body: JSON.stringify(templateId ? { templateId } : {}) }
    ),
  get: () => fetchAPI<any>('/today-sheet'),
  updateTodo: (id: string, updates: { content?: string; description?: string; status?: string; dueDate?: string | null; timeEstimate?: TimeEstimate }) =>
    fetchAPI<any>(`/today-sheet/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  reorder: (updates: Array<{ id: string; section: string; order: number }>) =>
    fetchAPI('/today-sheet/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    }),
};

// Ollama
export interface OllamaModel {
  name: string;
  modifiedAt: string;
  size: number;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
  error?: string;
}

export const ollamaAPI = {
  listModels: () => fetchAPI<OllamaModelsResponse>('/ollama/models'),
};

// Settings
export interface Settings {
  id: string;
  userId: string;
  llmProvider: 'openai' | 'anthropic' | 'ollama';
  llmModel: string | null;
  llmTemperature: number;
  ollamaBaseUrl: string;
  organizationSchedule: string;
  scheduleEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const settingsAPI = {
  get: () => fetchAPI<Settings>('/settings'),
  update: (data: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
    fetchAPI<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
};
