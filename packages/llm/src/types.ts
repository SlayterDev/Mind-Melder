import type { Capture, Template, Todo, Tag } from 'types';

// Today Sheet types
export interface TodaySheetInput {
  captures: Capture[];
  existingTodos: Todo[];
  feedbackTodos: Todo[];
  template: Template;
  tags?: Tag[]; // Optional user-defined tags for categorization
  includeDescriptions?: boolean; // Whether to include tag descriptions in prompts (default: false)
  context: {
    currentTimeOfDay: number; // 0-23
    workingHoursMinutes: number;
    currentDate: string; // ISO date (YYYY-MM-DD)
  };
}

export interface TodaySheetTaskItem {
  title: string;
  description?: string;
  timeEstimate: 'quick' | 'medium' | 'long';
  priorityScore: number; // 0-100
  tags: string[];
  sourceType: 'capture' | 'todo';
  sourceId: string; // captureId or todoId
  dueDate?: string; // ISO date string
}

export interface TodaySheetOutput {
  summary: string; // Natural language plan summary (1-2 sentences)
  sections: {
    must_do_today: TodaySheetTaskItem[];
    likely_today: TodaySheetTaskItem[];
    opportunistic: TodaySheetTaskItem[];
    overflow: TodaySheetTaskItem[];
  };
  totalEstimatedMinutes: number;
}

// Organization result from LLM
export interface OrganizedOutput {
  todos: TodaySheetTaskItem[];
}

// LLM Provider interface
export interface LLMProvider {
  /**
   * Organize a batch of captures by extracting actionable todos
   * @param captures - Array of unorganized captures
   * @param template - User template with organization instructions
   * @param tags - Optional array of user-defined category tags (with descriptions)
   * @param includeDescriptions - Whether to include tag descriptions in prompts (default: false)
   * @returns Extracted todos
   */
  organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean): Promise<OrganizedOutput>;

  /**
   * Extract actionable tasks from text
   * @param text - Natural language text
   * @returns Array of extracted todos
   */
  extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]>;

  /**
   * Generate a Today Sheet from captures and todos
   * @param input - Captures, todos, template, and context
   * @returns Prioritized sections with tasks, summary, and time estimate
   */
  generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput>;
}

// Provider configuration
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
}

// Settings-based configuration (from database)
export interface SettingsConfig {
  llmProvider: 'openai' | 'anthropic' | 'ollama';
  llmModel: string | null;
  llmTemperature: number;
  ollamaBaseUrl: string;
}
