import { z } from 'zod';

// Validation schema for TodaySheetTaskItem
export const todaySheetTaskItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  timeEstimate: z.enum(['quick', 'medium', 'long']),
  priorityScore: z.number().min(0).max(100),
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

// Export inferred types
export type OrganizedOutputSchema = z.infer<typeof organizedOutputSchema>;
export type TodaySheetOutputSchema = z.infer<typeof todaySheetOutputSchema>;
