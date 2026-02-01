import { z } from 'zod';

// Capture validation schemas
export const createCaptureSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;

// Organized Note validation schemas
export const createOrganizedNoteSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  category: z.string().max(100).optional(),
  date: z.date().optional(),
});

export const updateOrganizedNoteSchema = z.object({
  content: z.string().min(1).max(50000).optional(),
  category: z.string().max(100).optional(),
});

export type CreateOrganizedNoteInput = z.infer<typeof createOrganizedNoteSchema>;
export type UpdateOrganizedNoteInput = z.infer<typeof updateOrganizedNoteSchema>;

// Todo validation schemas
export const createTodoSchema = z.object({
  content: z.string().min(1, 'Content is required').max(1000, 'Content too long'),
  dueDate: z.string().datetime().optional(),
});

export const timeEstimateSchema = z.enum(['quick', 'medium', 'long', 'none']);

export const updateTodoSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['pending', 'completed']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  timeEstimate: timeEstimateSchema.optional(),
});

export type TimeEstimate = z.infer<typeof timeEstimateSchema>;

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

// Template validation schemas
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(5000, 'Prompt too long'),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  prompt: z.string().min(10).max(5000).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// Settings validation schemas
export const llmProviderSchema = z.enum(['openai', 'anthropic', 'ollama']);

export const updateSettingsSchema = z.object({
  llmProvider: llmProviderSchema.optional(),
  llmModel: z.string().max(100).nullable().optional(),
  llmTemperature: z.number().min(0).max(2).optional(),
  ollamaBaseUrl: z.string().url().max(500).optional(),
  organizationSchedule: z.string().max(100).optional(),
  scheduleEnabled: z.boolean().optional(),
});

export type LLMProvider = z.infer<typeof llmProviderSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
