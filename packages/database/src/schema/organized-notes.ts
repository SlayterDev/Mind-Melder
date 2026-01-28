import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

export const organizedNotes = pgTable(
  'organized_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    content: text('content').notNull(),
    category: text('category'),
    date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('organized_notes_user_id_idx').on(table.userId),
    dateIdx: index('organized_notes_date_idx').on(table.date),
    categoryIdx: index('organized_notes_category_idx').on(table.category),
  })
);

export type OrganizedNote = typeof organizedNotes.$inferSelect;
export type NewOrganizedNote = typeof organizedNotes.$inferInsert;
