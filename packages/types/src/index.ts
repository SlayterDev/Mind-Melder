// Shared TypeScript types for the Mind Melder application
// Re-export database types for use across the application

export type { Capture, NewCapture } from 'database';
export type { OrganizedNote, NewOrganizedNote } from 'database';
export type { Todo, NewTodo } from 'database';
export type { Template, NewTemplate } from 'database';
export type { Settings, NewSettings } from 'database';
export type { Tag, NewTag } from 'database';
export type { Conversation, NewConversation, ChatMessage, NewChatMessage, ToolCall, ToolResult } from 'database';

// Export validation schemas and types
export * from './validation.js';

// API Response types
export interface OrganizationResult {
  todosCount: number;
  capturesProcessed: number;
}
