import { pgTable, text, uuid, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const tokenUsage = pgTable(
  'token_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    provider: text('provider').notNull(), // openai | anthropic | ollama
    model: text('model').notNull(),
    method: text('method').notNull(), // organize | today_sheet | weekly_review | chat | refine_note | generate_title | transcribe | template_suggestions | extract_tasks
    inputTokens: integer('input_tokens'), // nullable for ollama/transcription
    outputTokens: integer('output_tokens'), // nullable
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('token_usage_user_id_idx').on(table.userId),
    createdAtIdx: index('token_usage_created_at_idx').on(table.createdAt),
    userCreatedAtIdx: index('token_usage_user_created_at_idx').on(table.userId, table.createdAt),
  })
);

export type TokenUsageRecord = typeof tokenUsage.$inferSelect;
export type NewTokenUsageRecord = typeof tokenUsage.$inferInsert;
