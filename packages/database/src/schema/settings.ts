import { pgTable, uuid, text, timestamp, real, boolean, index, pgEnum } from 'drizzle-orm/pg-core';

export const llmProviderEnum = pgEnum('llm_provider', ['openai', 'anthropic', 'ollama']);
export const scheduleFrequencyEnum = pgEnum('schedule_frequency', ['daily', 'weekly']);

export const settings = pgTable(
  'settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull().unique(),
    llmProvider: llmProviderEnum('llm_provider').notNull().default('openai'),
    llmModel: text('llm_model'),
    llmTemperature: real('llm_temperature').notNull().default(0.7),
    ollamaBaseUrl: text('ollama_base_url').notNull().default('http://localhost:11434'),

    // Today Sheet scheduling
    todaySheetScheduleEnabled: boolean('today_sheet_schedule_enabled').notNull().default(false),
    todaySheetTime: text('today_sheet_time').notNull().default('08:00'), // HH:MM format

    // Organization scheduling (deprecated CRON fields kept for backwards compatibility)
    organizationSchedule: text('organization_schedule').notNull().default('0 17 * * *'),
    scheduleEnabled: boolean('schedule_enabled').notNull().default(false),

    // Local Whisper (whisper.cpp server)
    whisperEnabled: boolean('whisper_enabled').notNull().default(false),
    whisperUrl: text('whisper_url').notNull().default('http://127.0.0.1:3005'),

    // New Organization scheduling
    organizeScheduleEnabled: boolean('organize_schedule_enabled').notNull().default(false),
    organizeScheduleFrequency: scheduleFrequencyEnum('organize_schedule_frequency')
      .notNull()
      .default('daily'),
    organizeScheduleTime: text('organize_schedule_time').notNull().default('17:00'), // HH:MM format
    organizeScheduleWeekday: text('organize_schedule_weekday').notNull().default('1'), // 0-6 (Sunday-Saturday)

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('settings_user_id_idx').on(table.userId),
  })
);

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
