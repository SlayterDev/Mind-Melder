import { Router } from 'express';
import { z } from 'zod';
import type { Database, SettingsRepository } from 'database';
import { ProviderFactory } from 'llm';
import type { TokenTrackingService } from '../services/token-tracking-service.js';
import { TodosRepository } from 'database';
import { TodaySheetService } from '../services/today-sheet-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

// Validation schemas
const generateSheetSchema = z.object({
  templateId: z.string().uuid().optional(),
});

const updateTodoSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  description: z.string().max(5000).optional(),
  todaySheetSection: z.enum(['must_do_today', 'likely_today', 'opportunistic', 'overflow', 'none']).optional(),
  todaySheetOrder: z.number().int().optional(),
  timeEstimate: z.enum(['quick', 'medium', 'long', 'none']).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['pending', 'completed']).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

const reorderSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    section: z.string(),
    order: z.number().int(),
  })),
});

export function createTodaySheetRouter(db: Database, settingsRepo: SettingsRepository, tokenTracker?: TokenTrackingService): Router {
  const router = Router();
  const todosRepo = new TodosRepository(db);

  // POST /api/v1/today-sheet/generate - Generate Today Sheet
  router.post(
    '/generate',
    validateBody(generateSheetSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { templateId } = req.body;

      try {
        const settings = await settingsRepo.getOrCreate(userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const todaySheetService = new TodaySheetService(db, llmProvider);
        const sheet = await todaySheetService.generateSheet(userId, templateId, settings.contentLockEnabled);

        if (tokenTracker && llmProvider.lastUsage) {
          tokenTracker.trackUsage(userId, settings.llmProvider, settings.llmModel || 'default', 'today_sheet', llmProvider.lastUsage);
        }

        res.status(200).json({
          success: true,
          sheet,
          message: `Generated today's plan with ${sheet.capturesProcessed} captures`,
        });
      } catch (error) {
        console.error('Today Sheet generation error:', error);
        throw error;
      }
    })
  );

  // GET /api/v1/today-sheet - Get current Today Sheet
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);
      const todaySheetService = new TodaySheetService(db, llmProvider);
      const sheet = await todaySheetService.getSheet(userId);

      if (!sheet) {
        throw new ApiError(404, 'No today sheet found');
      }

      res.json(sheet);
    })
  );

  // PATCH /api/v1/today-sheet/todos/:id - Update a todo in the sheet
  router.patch(
    '/todos/:id',
    validateBody(updateTodoSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { dueDate, ...otherUpdates } = req.body;

      // Convert dueDate string to Date object if provided
      const updates = {
        ...otherUpdates,
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      };

      const todo = await todosRepo.update(id, updates);

      if (!todo) {
        throw new ApiError(404, 'Todo not found');
      }

      res.json(todo);
    })
  );

  // PATCH /api/v1/today-sheet/reorder - Bulk reorder todos
  router.patch(
    '/reorder',
    validateBody(reorderSchema),
    asyncHandler(async (req, res) => {
      const { updates } = req.body;

      await todosRepo.updatePositions(updates);

      res.status(200).json({ success: true });
    })
  );

  return router;
}
