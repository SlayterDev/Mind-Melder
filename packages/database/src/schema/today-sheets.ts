import { pgTable, uuid, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';

export const todaySheets = pgTable(
  'today_sheets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    summary: text('summary').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    capturesProcessed: integer('captures_processed').notNull().default(0),
    todosIncluded: integer('todos_included').notNull().default(0),
    totalEstimatedMinutes: integer('total_estimated_minutes').notNull().default(0),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('today_sheets_user_id_idx').on(table.userId),
    generatedAtIdx: index('today_sheets_generated_at_idx').on(table.generatedAt),
  })
);

export type TodaySheet = typeof todaySheets.$inferSelect;
export type NewTodaySheet = typeof todaySheets.$inferInsert;
