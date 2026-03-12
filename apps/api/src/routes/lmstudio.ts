import { Router, type Router as ExpressRouter } from 'express';
import { SettingsRepository } from 'database';
import { asyncHandler } from '../utils/async-handler.js';

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';

export interface LMStudioModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

export function createLMStudioRouter(settingsRepo: SettingsRepository): ExpressRouter {
  const router = Router();

  // GET /api/v1/lmstudio/models - List models loaded in LM Studio
  router.get(
    '/models',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const settings = await settingsRepo.getOrCreate(userId);
      const baseURL = settings.lmstudioBaseUrl || DEFAULT_BASE_URL;

      try {
        const response = await fetch(`${baseURL}/models`, {
          headers: { Authorization: 'Bearer lm-studio' },
        });

        if (!response.ok) {
          throw new Error(`LM Studio returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as { data: LMStudioModel[] };

        const models: LMStudioModel[] = (data.data ?? []).map((m: LMStudioModel) => ({
          id: m.id,
          object: m.object,
          created: m.created,
          owned_by: m.owned_by,
        }));

        res.json({ models });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to connect to LM Studio';
        res.status(503).json({ models: [], error: message });
      }
    }),
  );

  // GET /api/v1/lmstudio/health - Check LM Studio connectivity
  router.get(
    '/health',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const settings = await settingsRepo.getOrCreate(userId);
      const baseURL = settings.lmstudioBaseUrl || DEFAULT_BASE_URL;

      try {
        const response = await fetch(`${baseURL}/models`, {
          headers: { Authorization: 'Bearer lm-studio' },
        });

        if (!response.ok) {
          throw new Error(`LM Studio returned ${response.status}: ${response.statusText}`);
        }

        res.json({ connected: true, baseURL });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to connect to LM Studio';
        res.json({ connected: false, baseURL, error: message });
      }
    }),
  );

  return router;
}
