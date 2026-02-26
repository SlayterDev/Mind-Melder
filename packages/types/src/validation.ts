import { z } from 'zod';

// Capture validation schemas
export const createCaptureSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  metadata: z.record(z.unknown()).optional(),
});

export const updateCaptureSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(10000, 'Content too long').optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => data.content !== undefined || data.metadata !== undefined, {
  message: 'At least one field (content or metadata) must be provided',
});

export type CreateCaptureInput = z.infer<typeof createCaptureSchema>;
export type UpdateCaptureInput = z.infer<typeof updateCaptureSchema>;

// Organized Note validation schemas
export const createOrganizedNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  date: z.date().optional(),
});

export const updateOrganizedNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type CreateOrganizedNoteInput = z.infer<typeof createOrganizedNoteSchema>;
export type UpdateOrganizedNoteInput = z.infer<typeof updateOrganizedNoteSchema>;

// Todo validation schemas
export const createTodoSchema = z.object({
  content: z.string().min(1, 'Content is required').max(1000, 'Content too long'),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const timeEstimateSchema = z.enum(['quick', 'medium', 'long', 'none']);

export const todaySheetSectionSchema = z.enum(['must_do_today', 'likely_today', 'opportunistic', 'overflow', 'none']);

export const feedbackVoteSchema = z.enum(['thumbs_up', 'thumbs_down', 'none']);

export const submitFeedbackSchema = z.object({
  vote: feedbackVoteSchema,
  feedbackText: z.string().max(100, 'Feedback text must be 100 characters or less').optional(),
});

export const updateTodoSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['pending', 'completed']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  timeEstimate: timeEstimateSchema.optional(),
  todaySheetSection: todaySheetSectionSchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type TimeEstimate = z.infer<typeof timeEstimateSchema>;
export type TodaySheetSection = z.infer<typeof todaySheetSectionSchema>;

export type FeedbackVote = z.infer<typeof feedbackVoteSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

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
export const scheduleFrequencySchema = z.enum(['daily', 'weekly']);

// Time format validation (HH:MM in 24-hour format)
const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const timeStringSchema = z.string().regex(timeFormatRegex, 'Time must be in HH:MM format (00:00-23:59)');

export const updateSettingsSchema = z.object({
  llmProvider: llmProviderSchema.optional(),
  llmModel: z.string().max(100).nullable().optional(),
  llmTemperature: z.number().min(0).max(2).optional(),
  ollamaBaseUrl: z.string().url().max(500).optional(),

  // Local Whisper (whisper.cpp server)
  whisperEnabled: z.boolean().optional(),
  whisperUrl: z.string().url().max(500).optional(),

  // Content Lock
  contentLockEnabled: z.boolean().optional(),

  // Include Tag Descriptions in LLM prompts
  includeTagDescriptions: z.boolean().optional(),

  // Legacy CRON-based scheduling (kept for backwards compatibility)
  organizationSchedule: z.string().max(100).optional(),
  scheduleEnabled: z.boolean().optional(),
  
  // Today Sheet scheduling
  todaySheetScheduleEnabled: z.boolean().optional(),
  todaySheetTime: timeStringSchema.optional(),
  
  // Organization scheduling
  organizeScheduleEnabled: z.boolean().optional(),
  organizeScheduleFrequency: scheduleFrequencySchema.optional(),
  organizeScheduleTime: timeStringSchema.optional(),
  organizeScheduleWeekday: z.string().regex(/^[0-6]$/, 'Weekday must be 0-6 (Sunday-Saturday)').optional(),

  // Desktop notifications
  notificationsEnabled: z.boolean().optional(),
  notificationsMorningReminderEnabled: z.boolean().optional(),
  notificationsMorningReminderTime: timeStringSchema.optional(),
  notificationsAfternoonReminderEnabled: z.boolean().optional(),
  notificationsAfternoonReminderTime: timeStringSchema.optional(),
  notificationsShowOverdue: z.boolean().optional(),
  notificationsQuietHoursStart: timeStringSchema.nullable().optional(),
  notificationsQuietHoursEnd: timeStringSchema.nullable().optional(),
});

export type LLMProvider = z.infer<typeof llmProviderSchema>;
export type ScheduleFrequency = z.infer<typeof scheduleFrequencySchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// Tag validation schemas
export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

// Conversation validation schemas
export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  model: z.string().max(100).optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title too long').optional(),
});

export const chatMessageInputSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(50000, 'Message too long'),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>;
