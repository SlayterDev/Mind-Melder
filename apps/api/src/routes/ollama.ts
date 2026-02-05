import { Router, type Router as ExpressRouter } from 'express';
import { Ollama } from 'ollama';
import { SettingsRepository } from 'database';
import { asyncHandler } from '../utils/async-handler.js';

export interface OllamaModel {
  name: string;
  modifiedAt: string;
  size: number;
}

export function createOllamaRouter(settingsRepo: SettingsRepository): ExpressRouter {
  const router = Router();

  // GET /api/v1/ollama/models - List available Ollama models
  router.get(
    '/models',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      // Get user settings to find the Ollama base URL
      const settings = await settingsRepo.getOrCreate(userId);
      const baseUrl = settings.ollamaBaseUrl || 'http://localhost:11434';

      try {
        const client = new Ollama({ host: baseUrl });
        const response = await client.list();

        const models: OllamaModel[] = response.models.map((model) => ({
          name: model.name,
          modifiedAt: typeof model.modified_at === 'string'
            ? model.modified_at
            : (model.modified_at as Date).toISOString(),
          size: model.size,
        }));

        res.json({ models });
      } catch (error) {
        // Return empty list with error info if Ollama is unreachable
        const message = error instanceof Error ? error.message : 'Failed to connect to Ollama';
        res.status(503).json({
          models: [],
          error: message,
        });
      }
    })
  );

  return router;
}
