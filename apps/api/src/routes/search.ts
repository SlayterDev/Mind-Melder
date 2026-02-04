import { Router, type Router as ExpressRouter } from 'express';
import { Database } from 'database';
import { asyncHandler } from '../utils/async-handler.js';
import { validateQuery } from '../middleware/index.js';
import { z } from 'zod';
import { SearchService, type SearchType } from '../services/search-service.js';

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['captures', 'todos', 'notes', 'all']).optional().default('all'),
});

export function createSearchRouter(db: Database): ExpressRouter {
  const router = Router();
  const searchService = new SearchService(db);

  // GET /api/v1/search?q=query&type=all|captures|todos|notes
  router.get(
    '/',
    validateQuery(searchQuerySchema),
    asyncHandler(async (req, res) => {
      const { q, type } = req.query as { q: string; type: SearchType };
      const userId = 'test-user-1'; // TODO: Get from auth context

      const results = await searchService.search(userId, q, type);
      res.json(results);
    })
  );

  return router;
}
