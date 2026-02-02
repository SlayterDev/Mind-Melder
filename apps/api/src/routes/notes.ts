import { Router, type Router as ExpressRouter } from 'express';
import { OrganizedNotesRepository } from 'database';
import { createOrganizedNoteSchema, updateOrganizedNoteSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

export function createNotesRouter(notesRepo: OrganizedNotesRepository): ExpressRouter {
  const router = Router();

  // GET /api/v1/notes - List notes (optional: filter by category)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { category } = req.query;

      let notes;
      if (category && typeof category === 'string') {
        notes = await notesRepo.findByCategory(userId, category);
      } else {
        notes = await notesRepo.findByUserId(userId);
      }

      res.json(notes);
    })
  );

  // POST /api/v1/notes - Create new note
  router.post(
    '/',
    validateBody(createOrganizedNoteSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { title, content, category, date } = req.body;

      const note = await notesRepo.create({ userId, title, content, category, date });
      res.status(201).json(note);
    })
  );

  // GET /api/v1/notes/:id - Get single note
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const note = await notesRepo.findById(id);
      if (!note) {
        throw new ApiError(404, 'Note not found');
      }

      res.json(note);
    })
  );

  // PATCH /api/v1/notes/:id - Update note
  router.patch(
    '/:id',
    validateBody(updateOrganizedNoteSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { title, content, category } = req.body;

      const note = await notesRepo.update(id, { title, content, category });
      if (!note) {
        throw new ApiError(404, 'Note not found');
      }

      res.json(note);
    })
  );

  // DELETE /api/v1/notes/:id - Delete note
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await notesRepo.delete(id);
      res.status(204).send();
    })
  );

  return router;
}
