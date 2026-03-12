import { Router, type Router as ExpressRouter } from 'express';
import OpenAI from 'openai';
import { SettingsRepository } from 'database';
import { asyncHandler } from '../utils/async-handler.js';

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';
const PLACEHOLDER_API_KEY = 'lm-studio';

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
        const client = new OpenAI({ apiKey: PLACEHOLDER_API_KEY, baseURL });
        const response = await client.models.list();

        const models: LMStudioModel[] = response.data.map((m) => ({
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
        const client = new OpenAI({ apiKey: PLACEHOLDER_API_KEY, baseURL });
        await client.models.list();
        res.json({ connected: true, baseURL });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to connect to LM Studio';
        res.json({ connected: false, baseURL, error: message });
      }
    }),
  );

  return router;
}
