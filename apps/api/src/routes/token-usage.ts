import { Router, type Router as ExpressRouter } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import type { TokenTrackingService } from '../services/token-tracking-service.js';

export function createTokenUsageRouter(tokenTrackingService: TokenTrackingService): ExpressRouter {
  const router = Router();

  // GET /api/v1/token-usage/summary - Aggregated usage summary
  router.get(
    '/summary',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const days = parseInt(req.query.days as string) || 30;

      const summary = await tokenTrackingService.getSummary(userId, days);
      res.json(summary);
    })
  );

  // GET /api/v1/token-usage - Detailed usage logs
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { start, end, provider, method, page, perPage } = req.query;

      const endDate = end ? new Date(end as string) : new Date();
      const startDate = start ? new Date(start as string) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const result = await tokenTrackingService.getDetails(
        userId,
        startDate,
        endDate,
        {
          provider: provider as string | undefined,
          method: method as string | undefined,
        },
        parseInt(page as string) || 1,
        parseInt(perPage as string) || 50
      );

      res.json(result);
    })
  );

  return router;
}
