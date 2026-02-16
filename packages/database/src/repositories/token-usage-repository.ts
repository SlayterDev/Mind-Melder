import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { tokenUsage, type TokenUsageRecord, type NewTokenUsageRecord } from '../schema/token-usage.js';
import type { Database } from '../client.js';

export interface AggregatedUsage {
  provider: string;
  model: string;
  method: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  count: number;
}

export interface UsageTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
}

export class TokenUsageRepository {
  constructor(private db: Database) {}

  async create(data: NewTokenUsageRecord): Promise<TokenUsageRecord> {
    const [record] = await this.db.insert(tokenUsage).values(data).returning();
    return record;
  }

  async getByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    filters?: { provider?: string; method?: string },
    page: number = 1,
    perPage: number = 50
  ): Promise<{ records: TokenUsageRecord[]; total: number }> {
    const conditions = [
      eq(tokenUsage.userId, userId),
      gte(tokenUsage.createdAt, startDate),
      lte(tokenUsage.createdAt, endDate),
    ];
    if (filters?.provider) conditions.push(eq(tokenUsage.provider, filters.provider));
    if (filters?.method) conditions.push(eq(tokenUsage.method, filters.method));

    const where = and(...conditions);

    const [records, countResult] = await Promise.all([
      this.db
        .select()
        .from(tokenUsage)
        .where(where)
        .orderBy(desc(tokenUsage.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db
        .select({ count: sql<number>`count(*)::integer` })
        .from(tokenUsage)
        .where(where),
    ]);

    return { records, total: countResult[0]?.count ?? 0 };
  }

  async getAggregatedUsage(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AggregatedUsage[]> {
    const results = await this.db
      .select({
        provider: tokenUsage.provider,
        model: tokenUsage.model,
        method: tokenUsage.method,
        totalInputTokens: sql<number>`coalesce(sum(${tokenUsage.inputTokens}), 0)::integer`,
        totalOutputTokens: sql<number>`coalesce(sum(${tokenUsage.outputTokens}), 0)::integer`,
        count: sql<number>`count(*)::integer`,
      })
      .from(tokenUsage)
      .where(
        and(
          eq(tokenUsage.userId, userId),
          gte(tokenUsage.createdAt, startDate),
          lte(tokenUsage.createdAt, endDate)
        )
      )
      .groupBy(tokenUsage.provider, tokenUsage.model, tokenUsage.method);

    return results;
  }

  async getTotalUsage(userId: string): Promise<UsageTotals> {
    const [result] = await this.db
      .select({
        totalInputTokens: sql<number>`coalesce(sum(${tokenUsage.inputTokens}), 0)::integer`,
        totalOutputTokens: sql<number>`coalesce(sum(${tokenUsage.outputTokens}), 0)::integer`,
        totalRequests: sql<number>`count(*)::integer`,
      })
      .from(tokenUsage)
      .where(eq(tokenUsage.userId, userId));

    return result ?? { totalInputTokens: 0, totalOutputTokens: 0, totalRequests: 0 };
  }
}
