import { Router, type Router as ExpressRouter } from 'express';
import { TagsRepository } from 'database';
import { createTagSchema, updateTagSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

export function createTagsRouter(tagsRepo: TagsRepository): ExpressRouter {
  const router = Router();

  // POST /api/v1/tags - Create tag
  router.post(
    '/',
    validateBody(createTagSchema),
    asyncHandler(async (req, res) => {
      const { name, description } = req.body;
      const userId = 'test-user-1'; // TODO: Get from auth context

      const tag = await tagsRepo.create({
        name,
        description,
        userId,
      });

      res.status(201).json(tag);
    })
  );

  // GET /api/v1/tags - List user's tags
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const tags = await tagsRepo.findByUserId(userId);
      res.json(tags);
    })
  );

  // GET /api/v1/tags/:id - Get single tag
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const tag = await tagsRepo.findById(id);
      if (!tag) {
        throw new ApiError(404, 'Tag not found');
      }

      res.json(tag);
    })
  );

  // PATCH /api/v1/tags/:id - Update tag
  router.patch(
    '/:id',
    validateBody(updateTagSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, description } = req.body;

      const tag = await tagsRepo.update(id, {
        name,
        description,
      });

      if (!tag) {
        throw new ApiError(404, 'Tag not found');
      }

      res.json(tag);
    })
  );

  // DELETE /api/v1/tags/:id - Delete tag
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await tagsRepo.delete(id);
      res.status(204).send();
    })
  );

  return router;
}
