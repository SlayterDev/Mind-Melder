import { z } from 'zod';

// Validation schema for TodaySheetTaskItem
export const todaySheetTaskItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  timeEstimate: z.enum(['quick', 'medium', 'long']),
  priorityScore: z.number().int().min(0).max(100),
  tags: z.array(z.string()),
  sourceType: z.enum(['capture', 'todo']),
  sourceId: z.string().uuid(),
  dueDate: z.string().optional(),
});

// Validation schema for OrganizedOutput
export const organizedOutputSchema = z.object({
  todos: z.array(todaySheetTaskItemSchema)
});

// Validation schema for TodaySheetOutput
export const todaySheetOutputSchema = z.object({
  summary: z.string(),
  sections: z.object({
    must_do_today: z.array(todaySheetTaskItemSchema),
    likely_today: z.array(todaySheetTaskItemSchema),
    opportunistic: z.array(todaySheetTaskItemSchema),
    overflow: z.array(todaySheetTaskItemSchema),
  }),
  totalEstimatedMinutes: z.number(),
});

// Validation schema for WeeklyReviewOutput
export const weeklyReviewOutputSchema = z.object({
  summary: z.string(),
  insights: z.object({
    accomplishments: z.array(z.string()),
    patterns: z.object({
      completionRate: z.number().min(0).max(100),
      topCategories: z.array(z.string()),
      observations: z.array(z.string()),
    }),
    carryForward: z.array(z.object({
      todoId: z.string().uuid(),
      content: z.string(),
      reason: z.string(),
    })),
    recommendations: z.array(z.string()),
  }),
});

// Validation schema for TemplateSuggestionsOutput
// Uses z.array() instead of z.tuple() for compatibility with JSON Schema Structured Outputs
export const templateSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    title: z.string(),
    description: z.string(),
    improvedPrompt: z.string(),
  })),
});

// Validation schema for ExtractTasksOutput
export const extractTasksOutputSchema = z.object({
  todos: z.array(z.object({
    content: z.string(),
    dueDate: z.string().optional(),
  })),
});

// Validation schema for RefineNoteOutput
export const refineNoteOutputSchema = z.object({
  title: z.string(),
  content: z.string(),
});

// Export inferred types
export type OrganizedOutputSchema = z.infer<typeof organizedOutputSchema>;
export type TodaySheetOutputSchema = z.infer<typeof todaySheetOutputSchema>;
export type WeeklyReviewOutputSchema = z.infer<typeof weeklyReviewOutputSchema>;
export type TemplateSuggestionsOutputSchema = z.infer<typeof templateSuggestionsOutputSchema>;
export type ExtractTasksOutputSchema = z.infer<typeof extractTasksOutputSchema>;
export type RefineNoteOutputSchema = z.infer<typeof refineNoteOutputSchema>;
