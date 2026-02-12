import { Router, type Router as ExpressRouter } from 'express';
import { CapturesRepository } from 'database';
import { createCaptureSchema, updateCaptureSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

export function createCapturesRouter(capturesRepo: CapturesRepository): ExpressRouter {
  const router = Router();

  // POST /api/v1/captures - Create new capture
  router.post(
    '/',
    validateBody(createCaptureSchema),
    asyncHandler(async (req, res) => {
      const { content, metadata } = req.body;
      const userId = 'test-user-1'; // TODO: Get from auth context in M4

      const capture = await capturesRepo.create({
        content,
        metadata,
        userId,
      });

      res.status(201).json(capture);
    })
  );

  // GET /api/v1/captures - List user's captures
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const captures = await capturesRepo.findByUserId(userId);
      res.json(captures);
    })
  );

  // GET /api/v1/captures/unorganized - Get unorganized captures
  router.get(
    '/unorganized',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const captures = await capturesRepo.findUnorganized(userId);
      res.json(captures);
    })
  );

  // GET /api/v1/captures/:id - Get single capture
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const capture = await capturesRepo.findById(id);
      if (!capture) {
        throw new ApiError(404, 'Capture not found');
      }

      res.json(capture);
    })
  );

  // PATCH /api/v1/captures/:id - Update capture
  router.patch(
    '/:id',
    validateBody(updateCaptureSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { content, metadata } = req.body;

      const capture = await capturesRepo.update(id, { content, metadata });
      if (!capture) {
        throw new ApiError(404, 'Capture not found');
      }

      res.json(capture);
    })
  );

  // DELETE /api/v1/captures/:id - Delete capture
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await capturesRepo.delete(id);
      res.status(204).send();
    })
  );

  return router;
}
