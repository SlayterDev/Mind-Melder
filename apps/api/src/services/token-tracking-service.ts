import type { TokenUsageRepository } from 'database';
import type { TokenUsage } from 'llm';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TokenTrackingService');

export class TokenTrackingService {
  constructor(private tokenUsageRepo: TokenUsageRepository) {}

  async trackUsage(
    userId: string,
    provider: string,
    model: string,
    method: string,
    usage: TokenUsage
  ): Promise<void> {
    try {
      await this.tokenUsageRepo.create({
        userId,
        provider,
        model,
        method,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
      logger.debug('Token usage recorded', {
        userId,
        provider,
        model,
        method,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    } catch (error) {
      // Log but don't throw — token tracking should never break the main flow
      logger.errorWithException('Failed to track token usage', error, {
        userId,
        provider,
        model,
        method,
      });
    }
  }

  async getSummary(userId: string, days: number = 30) {
    logger.debug('Fetching token usage summary', { userId, days });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [aggregated, totals] = await Promise.all([
      this.tokenUsageRepo.getAggregatedUsage(userId, startDate, endDate),
      this.tokenUsageRepo.getTotalUsageByDateRange(userId, startDate, endDate),
    ]);

    return { aggregated, totals, periodDays: days };
  }

  async getDetails(
    userId: string,
    startDate: Date,
    endDate: Date,
    filters?: { provider?: string; method?: string },
    page: number = 1,
    perPage: number = 50
  ) {
    logger.debug('Fetching token usage details', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filters,
      page,
      perPage,
    });

    return this.tokenUsageRepo.getByDateRange(userId, startDate, endDate, filters, page, perPage);
  }
}
