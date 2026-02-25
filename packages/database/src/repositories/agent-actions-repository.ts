import { eq, and, lt, sql } from 'drizzle-orm';
import {
  agentActions,
  agentFeedback,
  type AgentAction,
  type NewAgentAction,
  type AgentFeedback,
  type NewAgentFeedback,
} from '../schema/agent-actions.js';
import type { Database } from '../client.js';

export class AgentActionsRepository {
  constructor(private db: Database) {}

  async create(data: NewAgentAction): Promise<AgentAction> {
    const [action] = await this.db.insert(agentActions).values(data).returning();
    return action;
  }

  async findById(id: string): Promise<AgentAction | undefined> {
    const [action] = await this.db.select().from(agentActions).where(eq(agentActions.id, id));
    return action;
  }

  async findPending(userId: string): Promise<AgentAction[]> {
    return this.db
      .select()
      .from(agentActions)
      .where(and(eq(agentActions.userId, userId), eq(agentActions.status, 'pending')))
      .orderBy(sql`${agentActions.createdAt} DESC`);
  }

  async accept(id: string): Promise<AgentAction | undefined> {
    const now = new Date();
    const [action] = await this.db
      .update(agentActions)
      .set({ status: 'accepted', resolvedAt: now, updatedAt: now })
      .where(eq(agentActions.id, id))
      .returning();
    return action;
  }

  async reject(id: string): Promise<AgentAction | undefined> {
    const now = new Date();
    const [action] = await this.db
      .update(agentActions)
      .set({ status: 'rejected', resolvedAt: now, updatedAt: now })
      .where(eq(agentActions.id, id))
      .returning();
    return action;
  }

  async redirect(id: string, correction: Record<string, unknown>): Promise<AgentAction | undefined> {
    const now = new Date();
    const [action] = await this.db
      .update(agentActions)
      .set({ status: 'redirected', userCorrection: correction, resolvedAt: now, updatedAt: now })
      .where(eq(agentActions.id, id))
      .returning();
    return action;
  }

  async expireStale(userId: string): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expired = await this.db
      .update(agentActions)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(
          eq(agentActions.userId, userId),
          eq(agentActions.status, 'pending'),
          lt(agentActions.createdAt, cutoff)
        )
      )
      .returning();
    return expired.length;
  }

  async createFeedback(data: NewAgentFeedback): Promise<AgentFeedback> {
    const [feedback] = await this.db.insert(agentFeedback).values(data).returning();
    return feedback;
  }

  async findFeedbackByActionId(actionId: string): Promise<AgentFeedback | undefined> {
    const [feedback] = await this.db
      .select()
      .from(agentFeedback)
      .where(eq(agentFeedback.actionId, actionId));
    return feedback;
  }

  // Returns acceptance rate (0.0–1.0) over a rolling window of N days.
  // Used by threshold monitoring to auto-adjust confidence cutoffs.
  async getAcceptanceRate(userId: string, days: number): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.db
      .select({ outcome: agentFeedback.outcome })
      .from(agentFeedback)
      .where(
        and(
          eq(agentFeedback.userId, userId),
          sql`${agentFeedback.capturedAt} >= ${since}`
        )
      );

    if (rows.length === 0) return 1.0;

    const accepted = rows.filter((r) => r.outcome === 'accepted').length;
    return accepted / rows.length;
  }
}
