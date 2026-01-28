import type { Capture, Template } from 'types';

// Organization result from LLM
export interface OrganizedOutput {
  notes: {
    content: string;
    category?: string;
  }[];
  todos: {
    content: string;
    dueDate?: string; // ISO date string
  }[];
}

// LLM Provider interface
export interface LLMProvider {
  /**
   * Organize a batch of captures into structured notes and todos
   * @param captures - Array of unorganized captures
   * @param template - User template with organization instructions
   * @returns Structured notes and todos
   */
  organize(captures: Capture[], template: Template): Promise<OrganizedOutput>;

  /**
   * Extract actionable tasks from text
   * @param text - Natural language text
   * @returns Array of extracted todos
   */
  extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]>;
}

// Provider configuration
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}
