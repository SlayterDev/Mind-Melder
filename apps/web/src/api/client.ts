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
  update: (id: string, data: { content?: string; metadata?: Record<string, unknown> }) =>
    fetchAPI(`/captures/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/captures/${id}`, { method: 'DELETE' }),
};

// Todos
export type TimeEstimate = 'quick' | 'medium' | 'long' | 'none';

export const todosAPI = {
  list: (status?: 'pending' | 'completed') =>
    fetchAPI<any[]>(`/todos${status ? `?status=${status}` : ''}`),
  get: (id: string) => fetchAPI<any>(`/todos/${id}`),
  create: (data: { content: string; dueDate?: string; tags?: string[] }) =>
    fetchAPI('/todos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { content?: string; status?: string; dueDate?: string | null; description?: string; timeEstimate?: TimeEstimate; todaySheetSection?: string; tags?: string[] }) =>
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
  getTitles: (query?: string) =>
    fetchAPI<{ titles: string[] }>(`/notes/titles${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  get: (id: string) => fetchAPI<any>(`/notes/${id}`),
  create: (data: { title: string; content: string; tags?: string[] }) =>
    fetchAPI('/notes', { method: 'POST', body: JSON.stringify(data) }),
  append: (data: {title: string, contentToAppend: string}) =>
    fetchAPI('/notes/append', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
    fetchAPI(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/notes/${id}`, { method: 'DELETE' }),
  refine: (id: string, prompt: string) =>
    fetchAPI<{ title: string; content: string }>(`/notes/${id}/refine`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
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
  updateTodo: (id: string, updates: { content?: string; description?: string; status?: string; dueDate?: string | null; timeEstimate?: TimeEstimate; tags?: string[] }) =>
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

// Conversations
export interface Conversation {
  id: string;
  title: string | null;
  userId: string;
  model: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | null;
  toolCallId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[];
}

export const conversationsAPI = {
  list: () => fetchAPI<Conversation[]>('/conversations'),
  create: (data: { title?: string }) =>
    fetchAPI<Conversation>('/conversations', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => fetchAPI<ConversationWithMessages>(`/conversations/${id}`),
  update: (id: string, data: { title?: string }) =>
    fetchAPI<Conversation>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/conversations/${id}`, { method: 'DELETE' }),
  generateTitle: (id: string) =>
    fetchAPI<{ title: string }>(`/conversations/${id}/generate-title`, { method: 'POST' }),
};

// Settings
export interface Settings {
  id: string;
  userId: string;
  llmProvider: 'openai' | 'anthropic' | 'ollama';
  llmModel: string | null;
  llmTemperature: number;
  ollamaBaseUrl: string;

  // Local Whisper
  whisperEnabled: boolean;
  whisperUrl: string;

  // Content Lock
  contentLockEnabled: boolean;

  // Include Tag Descriptions in LLM prompts
  includeTagDescriptions: boolean;

  // Legacy CRON-based scheduling (deprecated but kept for compatibility)
  organizationSchedule: string;
  scheduleEnabled: boolean;
  
  // New scheduling fields
  todaySheetScheduleEnabled: boolean;
  todaySheetTime: string; // HH:MM format
  organizeScheduleEnabled: boolean;
  organizeScheduleFrequency: 'daily' | 'weekly';
  organizeScheduleTime: string; // HH:MM format
  organizeScheduleWeekday: string; // 0-6 (Sunday-Saturday)
  
  // Desktop Notifications
  notificationsEnabled: boolean;
  notificationsMorningReminderEnabled: boolean;
  notificationsMorningReminderTime: string; // HH:MM format
  notificationsAfternoonReminderEnabled: boolean;
  notificationsAfternoonReminderTime: string; // HH:MM format
  notificationsShowOverdue: boolean;
  notificationsQuietHoursStart: string | null;
  notificationsQuietHoursEnd: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export const settingsAPI = {
  get: () => fetchAPI<Settings>('/settings'),
  update: (data: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
    fetchAPI<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
};

// Search
export interface SearchResults {
  captures?: any[];
  todos?: any[];
  notes?: any[];
}

export const searchAPI = {
  search: (query: string, type: 'all' | 'captures' | 'todos' | 'notes' = 'all') =>
    fetchAPI<SearchResults>(`/search?q=${encodeURIComponent(query)}&type=${type}`),
};

// Transcription
export const transcribeAPI = {
  upload: async (blob: Blob): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const response = await fetch(`${getApiUrl()}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },
  uploadFile: async (file: File): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('audio', file, file.name);
    const response = await fetch(`${getApiUrl()}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  },
};

// Token Usage
export interface AggregatedUsage {
  provider: string;
  model: string;
  method: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  count: number;
}

export interface UsageTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
}

export interface UsageSummary {
  aggregated: AggregatedUsage[];
  totals: UsageTotals;
  periodDays: number;
}

export interface TokenUsageRecord {
  id: string;
  userId: string;
  provider: string;
  model: string;
  method: string;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string;
}

export interface UsageDetails {
  records: TokenUsageRecord[];
  total: number;
}

export const tokenUsageAPI = {
  getSummary: (days: number = 30) =>
    fetchAPI<UsageSummary>(`/token-usage/summary?days=${days}`),
  getDetails: (params: { start?: string; end?: string; provider?: string; method?: string; page?: number; perPage?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.start) searchParams.set('start', params.start);
    if (params.end) searchParams.set('end', params.end);
    if (params.provider) searchParams.set('provider', params.provider);
    if (params.method) searchParams.set('method', params.method);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.perPage) searchParams.set('perPage', params.perPage.toString());
    return fetchAPI<UsageDetails>(`/token-usage?${searchParams.toString()}`);
  },
};

// Weekly Reviews
export interface WeeklyReviewInsights {
  accomplishments: string[];
  patterns: {
    completionRate: number;
    topCategories: string[];
    observations: string[];
  };
  carryForward: Array<{
    todoId: string;
    content: string;
    reason: string;
  }>;
  recommendations: string[];
}

export interface WeeklyReview {
  id: string;
  userId: string;
  weekStartDate: string; // ISO date
  weekEndDate: string; // ISO date
  summary: string;
  insights: WeeklyReviewInsights;
  createdAt: string;
}

export interface TemplateSuggestion {
  title: string;
  description: string;
  improvedPrompt: string;
}

export const weeklyReviewAPI = {
  generate: (weekStartDate?: string, forceRegenerate?: boolean) =>
    fetchAPI<{ success: boolean; review: WeeklyReview; message: string }>(
      '/weekly-review/generate',
      {
        method: 'POST',
        body: JSON.stringify({ 
          ...(weekStartDate && { weekStartDate }),
          ...(forceRegenerate !== undefined && { forceRegenerate })
        }),
      }
    ),
  getLatest: () => fetchAPI<WeeklyReview>('/weekly-review/latest'),
  list: (page: number = 1, perPage: number = 10) =>
    fetchAPI<{ reviews: WeeklyReview[]; page: number; perPage: number }>(
      `/weekly-review?page=${page}&perPage=${perPage}`
    ),
  get: (id: string) => fetchAPI<WeeklyReview>(`/weekly-review/${id}`),
  // Note: Tuple type enforces exactly 3 suggestions, matching backend Zod schema
  getTemplateSuggestions: (templateId: string) =>
    fetchAPI<{ success: boolean; suggestions: [TemplateSuggestion, TemplateSuggestion, TemplateSuggestion] }>(
      '/weekly-review/template-suggestions',
      {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      }
    ),
};
