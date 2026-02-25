import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/async-handler.js';
import { validateQuery } from '../middleware/index.js';
import type { TokenTrackingService } from '../services/token-tracking-service.js';

// Validation schemas
const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

const detailsQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  provider: z.string().optional(),
  method: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export function createTokenUsageRouter(tokenTrackingService: TokenTrackingService): ExpressRouter {
  const router = Router();

  // GET /api/v1/token-usage/summary - Aggregated usage summary
  router.get(
    '/summary',
    validateQuery(summaryQuerySchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { days } = req.query;

      const summary = await tokenTrackingService.getSummary(userId, Number(days));
      res.json(summary);
    })
  );

  // GET /api/v1/token-usage - Detailed usage logs
  router.get(
    '/',
    validateQuery(detailsQuerySchema),
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
        Number(page),
        Number(perPage)
      );

      res.json(result);
    })
  );

  return router;
}
