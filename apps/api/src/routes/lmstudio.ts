import { Router, type Router as ExpressRouter } from 'express';
import { SettingsRepository } from 'database';
import { asyncHandler } from '../utils/async-handler.js';

const DEFAULT_HOST = 'http://localhost:1234';

export interface LMStudioModel {
  id: string;
  object: string;
  display_name?: string;
  created?: number;
  owned_by?: string;
}

/** Normalise a stored host value (host:port) to a full /v1 base URL */
function toBaseURL(host: string): string {
  const trimmed = host.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export function createLMStudioRouter(settingsRepo: SettingsRepository): ExpressRouter {
  const router = Router();

  // GET /api/v1/lmstudio/models - List models loaded in LM Studio
  router.get(
    '/models',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const settings = await settingsRepo.getOrCreate(userId);
      const baseURL = toBaseURL(settings.lmstudioBaseUrl || DEFAULT_HOST);

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
          display_name: m.display_name,
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
      const baseURL = toBaseURL(settings.lmstudioBaseUrl || DEFAULT_HOST);

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
