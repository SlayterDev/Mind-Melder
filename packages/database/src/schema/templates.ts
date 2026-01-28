import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const templates = pgTable(
  'templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    prompt: text('prompt').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('templates_user_id_idx').on(table.userId),
    isActiveIdx: index('templates_is_active_idx').on(table.isActive),
  })
);

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
