import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';

export const todoStatusEnum = pgEnum('todo_status', ['pending', 'completed']);

export const todos = pgTable(
  'todos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    content: text('content').notNull(),
    status: todoStatusEnum('status').notNull().default('pending'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('todos_user_id_idx').on(table.userId),
    statusIdx: index('todos_status_idx').on(table.status),
    dueDateIdx: index('todos_due_date_idx').on(table.dueDate),
  })
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
