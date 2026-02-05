import { pgTable, uuid, text, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system', 'tool']);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title'),
    userId: text('user_id').notNull(),
    model: text('model'),
    systemPrompt: text('system_prompt'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('conversations_user_id_idx').on(table.userId),
    updatedAtIdx: index('conversations_updated_at_idx').on(table.updatedAt),
  })
);

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  type: 'todo' | 'capture' | 'note';
  id: string;
}

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content'),
    toolCalls: jsonb('tool_calls').$type<ToolCall[]>(),
    toolCallId: text('tool_call_id'),
    toolResults: jsonb('tool_results').$type<ToolResult[]>(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    conversationIdIdx: index('chat_messages_conversation_id_idx').on(table.conversationId),
    createdAtIdx: index('chat_messages_created_at_idx').on(table.createdAt),
  })
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
