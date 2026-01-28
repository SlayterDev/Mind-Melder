import { Router } from 'express';
import { TemplatesRepository } from 'database';
import { createTemplateSchema, updateTemplateSchema } from 'types';
import { asyncHandler } from '../utils/async-handler';
import { validateBody, ApiError } from '../middleware';

export function createTemplatesRouter(templatesRepo: TemplatesRepository) {
  const router = Router();

  // POST /api/v1/templates - Create template
  router.post(
    '/',
    validateBody(createTemplateSchema),
    asyncHandler(async (req, res) => {
      const { name, prompt } = req.body;
      const userId = 'test-user-1'; // TODO: Get from auth context

      const template = await templatesRepo.create({
        name,
        prompt,
        userId,
      });

      res.status(201).json(template);
    })
  );

  // GET /api/v1/templates - List templates
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const templates = await templatesRepo.findByUserId(userId);
      res.json(templates);
    })
  );

  // GET /api/v1/templates/active - Get active templates
  router.get(
    '/active',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const templates = await templatesRepo.findActive(userId);
      res.json(templates);
    })
  );

  // GET /api/v1/templates/:id - Get single template
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const template = await templatesRepo.findById(id);
      if (!template) {
        throw new ApiError(404, 'Template not found');
      }

      res.json(template);
    })
  );

  // PATCH /api/v1/templates/:id - Update template
  router.patch(
    '/:id',
    validateBody(updateTemplateSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, prompt, isActive } = req.body;

      const template = await templatesRepo.update(id, { name, prompt, isActive });
      if (!template) {
        throw new ApiError(404, 'Template not found');
      }

      res.json(template);
    })
  );

  // DELETE /api/v1/templates/:id - Delete template
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await templatesRepo.delete(id);
      res.status(204).send();
    })
  );

  return router;
}
