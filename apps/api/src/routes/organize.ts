import { Router, type Router as ExpressRouter } from 'express';
import { OrganizationService } from '../services/organization-service.js';
import { ApiError } from '../middleware/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ProviderFactory } from 'llm';
import type { Database, SettingsRepository } from 'database';
import { z } from 'zod';

const organizeRequestSchema = z.object({
  templateId: z.string().uuid().optional(),
});

export function createOrganizeRouter(db: Database, settingsRepo: SettingsRepository): ExpressRouter {
  const router = Router();

  // POST /api/v1/organize - Trigger batch organization
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      // Validate request body if provided
      let templateId: string | undefined;
      if (Object.keys(req.body).length > 0) {
        const validated = organizeRequestSchema.parse(req.body);
        templateId = validated.templateId;
      }

      try {
        // Get user settings and create LLM provider from them
        const settings = await settingsRepo.getOrCreate(userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const organizationService = new OrganizationService(db, llmProvider);

        const result = await organizationService.organizeCaptures(userId, templateId);

        res.json({
          success: true,
          result,
          message: `Organized ${result.capturesProcessed} captures into ${result.organizedNotesCount} notes and ${result.todosCount} todos`,
        });
      } catch (error) {
        if (error instanceof Error) {
          throw new ApiError(400, error.message);
        }
        throw error;
      }
    })
  );

  return router;
}
