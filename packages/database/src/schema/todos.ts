import { pgTable, uuid, text, timestamp, pgEnum, index, integer, jsonb } from 'drizzle-orm/pg-core';
import { captures } from './captures.js';
import { todaySheets } from './today-sheets.js';

export const todoStatusEnum = pgEnum('todo_status', ['pending', 'completed']);

export const todaySheetSectionEnum = pgEnum('today_sheet_section', [
  'must_do_today',
  'likely_today',
  'opportunistic',
  'overflow',
  'none' // For regular todos not in today sheet
]);

export const timeEstimateEnum = pgEnum('time_estimate', [
  'quick',   // <15 min
  'medium',  // 30-60 min
  'long',    // >90 min
  'none'     // Not estimated
]);

export const todos = pgTable(
  'todos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    content: text('content').notNull(),
    description: text('description'),
    status: todoStatusEnum('status').notNull().default('pending'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    userId: text('user_id').notNull(),
    // Today Sheet fields
    todaySheetSection: todaySheetSectionEnum('today_sheet_section').default('none'),
    todaySheetOrder: integer('today_sheet_order'),
    todaySheetId: uuid('today_sheet_id').references(() => todaySheets.id, { onDelete: 'set null' }),
    timeEstimate: timeEstimateEnum('time_estimate').default('none'),
    priorityScore: integer('priority_score'),
    tags: jsonb('tags').$type<string[]>().default([]),
    captureId: uuid('capture_id').references(() => captures.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('todos_user_id_idx').on(table.userId),
    statusIdx: index('todos_status_idx').on(table.status),
    dueDateIdx: index('todos_due_date_idx').on(table.dueDate),
    todaySheetSectionIdx: index('todos_today_sheet_section_idx').on(table.todaySheetSection),
    todaySheetOrderIdx: index('todos_today_sheet_order_idx').on(table.todaySheetOrder),
  })
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
