import { Router, type Router as ExpressRouter } from 'express';
import { CapturesRepository, TodosRepository, OrganizedNotesRepository } from 'database';
import { asyncHandler } from '../utils/async-handler.js';
import { validateQuery, ApiError } from '../middleware/index.js';
import { z } from 'zod';

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['captures', 'todos', 'notes', 'all']).optional().default('all'),
});

export function createSearchRouter(
  capturesRepo: CapturesRepository,
  todosRepo: TodosRepository,
  notesRepo: OrganizedNotesRepository
): ExpressRouter {
  const router = Router();

  // GET /api/v1/search?q=query&type=all|captures|todos|notes
  router.get(
    '/',
    validateQuery(searchQuerySchema),
    asyncHandler(async (req, res) => {
      const { q, type } = req.query as { q: string; type: 'captures' | 'todos' | 'notes' | 'all' };
      const userId = 'test-user-1'; // TODO: Get from auth context

      const results: {
        captures?: Array<any>;
        todos?: Array<any>;
        notes?: Array<any>;
      } = {};

      // Search based on type filter
      if (type === 'all' || type === 'captures') {
        const captures = await capturesRepo.search(userId, q);
        results.captures = captures.map(c => ({
          ...c,
          type: 'capture' as const,
        }));
      }

      if (type === 'all' || type === 'todos') {
        const todos = await todosRepo.search(userId, q);
        results.todos = todos.map(t => ({
          ...t,
          type: 'todo' as const,
        }));
      }

      if (type === 'all' || type === 'notes') {
        const notes = await notesRepo.search(userId, q);
        results.notes = notes.map(n => ({
          ...n,
          type: 'note' as const,
        }));
      }

      res.json(results);
    })
  );

  return router;
}
