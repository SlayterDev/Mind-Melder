import type { Capture, Template, Todo, Tag, OrganizedNote } from 'types';

// Weekly Review types
export interface WeeklyReviewInput {
  weekStartDate: string; // ISO date (YYYY-MM-DD) - Monday
  weekEndDate: string; // ISO date (YYYY-MM-DD) - Sunday
  completedTodos: Todo[];
  pendingTodos: Todo[];
  captures: Capture[];
  notes: OrganizedNote[];
  todaySheets: any[]; // Using any[] to avoid circular dependency with database
}

export interface WeeklyReviewOutput {
  summary: string; // 2-3 sentence high-level week summary
  insights: {
    accomplishments: string[]; // Key completed tasks and achievements
    patterns: {
      completionRate: number; // 0-100 percentage
      topCategories: string[]; // Most active tag categories
      observations: string[]; // AI-generated behavioral observations
    };
    carryForward: Array<{
      todoId: string;
      content: string;
      reason: string; // Why it wasn't completed
    }>;
    recommendations: string[]; // Actionable suggestions for next week
  };
}

// Template Suggestions types
export interface TemplateSuggestion {
  title: string; // Brief title for the suggestion
  description: string; // Detailed explanation of why this would improve the template
  improvedPrompt: string; // The full improved template prompt text
}

export interface TemplateSuggestionsOutput {
  suggestions: TemplateSuggestion[];
}

// Today Sheet types
export interface TodaySheetInput {
  captures: Capture[];
  existingTodos: Todo[];
  feedbackTodos: Todo[];
  template: Template;
  tags?: Tag[]; // Optional user-defined tags for categorization
  includeDescriptions?: boolean; // Whether to include tag descriptions in prompts (default: false)
  contentLockEnabled?: boolean; // When true, preserve original capture/todo content
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

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  toolCallId?: string | null; // Required for tool role messages
  toolCalls?: ToolCall[] | null; // For assistant messages with tool calls
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolName: string, result: any) => void;
  onComplete: (fullMessage: string) => void;
  onError?: (error: Error) => void;
}

// LLM Provider interface
export interface LLMProvider {
  /** Token usage from the most recent API call (null if unavailable) */
  lastUsage: TokenUsage | null;

  /**
   * Organize a batch of captures by extracting actionable todos
   * @param captures - Array of unorganized captures
   * @param template - User template with organization instructions
   * @param tags - Optional array of user-defined category tags (with descriptions)
   * @param includeDescriptions - Whether to include tag descriptions in prompts (default: false)
   * @returns Extracted todos
   */
  organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean, contentLockEnabled?: boolean): Promise<OrganizedOutput>;

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

  streamChat(messages: ChatMessage[], callbacks: StreamCallbacks, tools?: ToolDefinition[]): Promise<void>;

  /**
   * Generate a concise title for a conversation based on its messages
   * @param messages - The conversation messages (typically first user + assistant exchange)
   * @returns A short descriptive title (roughly 6 words max)
   */
  generateTitle(messages: ChatMessage[]): Promise<string>;

  /**
   * Refine a note's content using a user-provided prompt
   * @param title - Current note title
   * @param content - Current note content (markdown)
   * @param prompt - User instruction for how to refine the note
   * @returns Refined title and content
   */
  refineNote(title: string, content: string, prompt: string): Promise<{ title: string; content: string }>;

  /**
   * Transcribe audio to text
   * @param audioBuffer - Raw audio data
   * @param options - Optional language hint and prompt
   * @returns Transcribed text
   */
  transcribe(audioBuffer: Buffer, options?: TranscribeOptions): Promise<TranscriptionResult>;

  /**
   * Generate a weekly review analyzing a week's worth of activity
   * @param input - Week's captures, todos, notes, and context
   * @returns Structured insights, accomplishments, and recommendations
   */
  generateWeeklyReview(input: WeeklyReviewInput): Promise<WeeklyReviewOutput>;

  /**
   * Generate suggestions to improve a template prompt
   * @param template - The current template to analyze
   * @param weeklyReview - Optional recent weekly review for context
   * @returns Three improvement suggestions with reasoning
   */
  generateTemplateSuggestions(template: Template, weeklyReview?: WeeklyReviewOutput): Promise<TemplateSuggestionsOutput>;
}

// Transcription types
export interface TranscribeOptions {
  language?: string;
  prompt?: string;
  filename?: string; // Optional original filename for the audio file
  mimeType?: string; // Optional MIME type for the audio file
}

export interface TranscriptionResult {
  text: string;
}

// Token usage tracking
export interface TokenUsage {
  inputTokens: number | null;
  outputTokens: number | null;
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
  llmProvider: 'openai' | 'anthropic' | 'ollama' | 'lmstudio';
  llmModel: string | null;
  llmTemperature: number;
  ollamaBaseUrl: string;
  lmstudioBaseUrl: string;
}
