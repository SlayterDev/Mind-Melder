import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const captures = pgTable(
  'captures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    content: text('content').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata'),
    userId: text('user_id').notNull(),
    organized: timestamp('organized_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('captures_user_id_idx').on(table.userId),
    organizedIdx: index('captures_organized_idx').on(table.organized),
    timestampIdx: index('captures_timestamp_idx').on(table.timestamp),
  })
);

export type Capture = typeof captures.$inferSelect;
export type NewCapture = typeof captures.$inferInsert;
