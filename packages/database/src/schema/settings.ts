import { pgTable, uuid, text, timestamp, real, boolean, index, pgEnum } from 'drizzle-orm/pg-core';

export const llmProviderEnum = pgEnum('llm_provider', ['openai', 'anthropic', 'ollama']);

export const settings = pgTable(
  'settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().unique(),
    llmProvider: llmProviderEnum('llm_provider').notNull().default('openai'),
    llmModel: text('llm_model'),
    llmTemperature: real('llm_temperature').notNull().default(0.7),
    ollamaBaseUrl: text('ollama_base_url').notNull().default('http://localhost:11434'),
    organizationSchedule: text('organization_schedule').notNull().default('0 17 * * *'),
    scheduleEnabled: boolean('schedule_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('settings_user_id_idx').on(table.userId),
  })
);

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
