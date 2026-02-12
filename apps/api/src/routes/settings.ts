import { Router, type Router as ExpressRouter } from 'express';
import { SettingsRepository } from 'database';
import { updateSettingsSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody } from '../middleware/index.js';
import type { SchedulerService } from '../services/scheduler-service.js';

export function createSettingsRouter(
  settingsRepo: SettingsRepository,
  scheduler?: SchedulerService
): ExpressRouter {
  const router = Router();

  // GET /api/v1/settings - Get user settings (creates defaults if none)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const settings = await settingsRepo.getOrCreate(userId);
      res.json(settings);
    })
  );

  // PATCH /api/v1/settings - Update settings (partial)
  router.patch(
    '/',
    validateBody(updateSettingsSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      // Ensure settings exist first
      await settingsRepo.getOrCreate(userId);

      const settings = await settingsRepo.update(userId, req.body);

      // Reload scheduler if any schedule-related settings changed
      if (scheduler && hasScheduleChanges(req.body)) {
        await scheduler.reload();
      }

      res.json(settings);
    })
  );

  return router;
}

/**
 * Check if the update contains schedule-related changes
 */
function hasScheduleChanges(updates: any): boolean {
  return !!(
    updates.todaySheetScheduleEnabled !== undefined ||
    updates.todaySheetTime !== undefined ||
    updates.organizeScheduleEnabled !== undefined ||
    updates.organizeScheduleFrequency !== undefined ||
    updates.organizeScheduleTime !== undefined ||
    updates.organizeScheduleWeekday !== undefined
  );
}
