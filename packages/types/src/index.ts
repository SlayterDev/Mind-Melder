// Shared TypeScript types for the Mind Melder application
// Re-export database types for use across the application

export type { Capture, NewCapture } from 'database';
export type { OrganizedNote, NewOrganizedNote } from 'database';
export type { Todo, NewTodo } from 'database';
export type { Template, NewTemplate } from 'database';

// Export validation schemas and types
export * from './validation';

// API Response types
export interface OrganizationResult {
  organizedNotesCount: number;
  todosCount: number;
  capturesProcessed: number;
}
