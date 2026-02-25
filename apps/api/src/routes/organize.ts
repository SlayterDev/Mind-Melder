import { Router, type Router as ExpressRouter } from 'express';
import { OrganizationService } from '../services/organization-service.js';
import { ApiError } from '../middleware/index.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ProviderFactory } from 'llm';
import type { Database, SettingsRepository } from 'database';
import { z } from 'zod';
import type { TokenTrackingService } from '../services/token-tracking-service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OrganizeRoute');

const organizeRequestSchema = z.object({
  templateId: z.string().uuid().optional(),
});

export function createOrganizeRouter(db: Database, settingsRepo: SettingsRepository, tokenTracker?: TokenTrackingService): ExpressRouter {
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

      logger.info('Organization triggered', { userId, templateId });

      try {
        // Get user settings and create LLM provider from them
        const settings = await settingsRepo.getOrCreate(userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const organizationService = new OrganizationService(db, llmProvider);

        const result = await organizationService.organizeCaptures(userId, templateId, settings.contentLockEnabled, settings.includeTagDescriptions);

        if (tokenTracker && llmProvider.lastUsage) {
          tokenTracker.trackUsage(userId, settings.llmProvider, settings.llmModel || 'default', 'organize', llmProvider.lastUsage);
        }

        logger.info('Organization request completed', {
          userId,
          capturesProcessed: result.capturesProcessed,
          todosCreated: result.todosCount,
        });

        res.json({
          success: true,
          result,
          message: `Processed ${result.capturesProcessed} captures and created ${result.todosCount} todos`,
        });
      } catch (error) {
        if (error instanceof Error) {
          logger.error('Organization request failed', { userId, error: error.message });
          throw new ApiError(400, error.message);
        }
        throw error;
      }
    })
  );

  return router;
}
