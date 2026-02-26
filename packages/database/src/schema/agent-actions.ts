import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  real,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { captures } from './captures.js';

export const agentTriggerTypeEnum = pgEnum('agent_trigger_type', [
  'capture',
  'scheduled',
  'threshold',
]);

export const agentActionTypeEnum = pgEnum('agent_action_type', [
  'create_task',
  'assign_due_date',
  'flag_followup',
  'detect_overcommitment',
  'suggest_defer',
]);

export const agentActionStatusEnum = pgEnum('agent_action_status', [
  'pending',
  'accepted',
  'rejected',
  'redirected',
  'expired',
]);

export const agentOutcomeEnum = pgEnum('agent_outcome', [
  'accepted',
  'rejected',
  'redirected',
]);

export const agentActions = pgTable(
  'agent_actions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    triggerType: agentTriggerTypeEnum('trigger_type').notNull(),
    triggerRef: uuid('trigger_ref').references(() => captures.id, { onDelete: 'set null' }),
    actionType: agentActionTypeEnum('action_type').notNull(),
    actionPayload: jsonb('action_payload').notNull(),
    confidence: real('confidence').notNull(),
    reason: text('reason').notNull(),
    status: agentActionStatusEnum('status').notNull().default('pending'),
    userCorrection: jsonb('user_correction'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('agent_actions_user_id_idx').on(table.userId),
    statusIdx: index('agent_actions_status_idx').on(table.status),
    createdAtIdx: index('agent_actions_created_at_idx').on(table.createdAt),
  })
);

export const agentFeedback = pgTable(
  'agent_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    actionId: uuid('action_id').references(() => agentActions.id, { onDelete: 'cascade' }),
    outcome: agentOutcomeEnum('outcome').notNull(),
    originalAction: jsonb('original_action').notNull(),
    correctedAction: jsonb('corrected_action'),
    capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('agent_feedback_user_id_idx').on(table.userId),
    actionIdIdx: index('agent_feedback_action_id_idx').on(table.actionId),
    capturedAtIdx: index('agent_feedback_captured_at_idx').on(table.capturedAt),
  })
);

export type AgentAction = typeof agentActions.$inferSelect;
export type NewAgentAction = typeof agentActions.$inferInsert;
export type AgentFeedback = typeof agentFeedback.$inferSelect;
export type NewAgentFeedback = typeof agentFeedback.$inferInsert;
