import { Router } from 'express';
import { OrganizationService } from '../services/organization-service';
import { ApiError } from '../middleware';
import { asyncHandler } from '../utils/async-handler';
import type { LLMProvider } from 'llm';
import type { Database } from 'database';
import { z } from 'zod';

const organizeRequestSchema = z.object({
  templateId: z.string().uuid().optional(),
});

export function createOrganizeRouter(db: Database, getLLMProvider: () => LLMProvider) {
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
        // Lazy-load LLM provider when needed
        const llmProvider = getLLMProvider();
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
