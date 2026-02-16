import { pgTable, text, uuid, timestamp, jsonb, date, index } from 'drizzle-orm/pg-core';

export const weeklyReviews = pgTable(
  'weekly_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    weekStartDate: date('week_start_date').notNull(), // ISO date string (YYYY-MM-DD) - Monday
    weekEndDate: date('week_end_date').notNull(), // ISO date string (YYYY-MM-DD) - Sunday
    summary: text('summary').notNull(), // High-level 2-3 sentence summary
    insights: jsonb('insights').notNull(), // Structured insights data
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('weekly_reviews_user_id_idx').on(table.userId),
    weekStartDateIdx: index('weekly_reviews_week_start_date_idx').on(table.weekStartDate),
    // Ensure only one review per week per user
    userWeekIdx: index('weekly_reviews_user_week_idx').on(table.userId, table.weekStartDate),
  })
);

export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type NewWeeklyReview = typeof weeklyReviews.$inferInsert;

// TypeScript type for the insights JSONB structure
export interface WeeklyReviewInsights {
  accomplishments: string[];
  patterns: {
    completionRate: number; // 0-100
    topCategories: string[]; // Most active tag categories
    observations: string[]; // AI-generated observations
  };
  carryForward: Array<{
    todoId: string;
    content: string;
    reason: string; // Why it wasn't completed
  }>;
  recommendations: string[];
}
