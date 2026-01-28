const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  return response.json();
}

// Captures
export const capturesAPI = {
  list: () => fetchAPI<any[]>('/captures'),
  listUnorganized: () => fetchAPI<any[]>('/captures/unorganized'),
  create: (data: { content: string; metadata?: Record<string, unknown> }) =>
    fetchAPI('/captures', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/captures/${id}`, { method: 'DELETE' }),
};

// Todos
export const todosAPI = {
  list: (status?: 'pending' | 'completed') =>
    fetchAPI<any[]>(`/todos${status ? `?status=${status}` : ''}`),
  create: (data: { content: string; dueDate?: string }) =>
    fetchAPI('/todos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { content?: string; status?: string; dueDate?: string }) =>
    fetchAPI(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  markComplete: (id: string) => fetchAPI(`/todos/${id}/complete`, { method: 'PATCH' }),
  delete: (id: string) => fetchAPI(`/todos/${id}`, { method: 'DELETE' }),
};

// Organized Notes
export const notesAPI = {
  list: (category?: string) =>
    fetchAPI<any[]>(`/notes${category ? `?category=${category}` : ''}`),
  update: (id: string, data: { content?: string; category?: string }) =>
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

// Organization
export const organizeAPI = {
  trigger: (templateId?: string) =>
    fetchAPI<{ success: boolean; result: any; message: string }>(
      '/organize',
      { method: 'POST', body: templateId ? JSON.stringify({ templateId }) : undefined }
    ),
};
