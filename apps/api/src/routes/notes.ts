import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { Database, OrganizedNotesRepository } from 'database';
import { createOrganizedNoteSchema, updateOrganizedNoteSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';
import { NotesService } from '../services/notes-service.js';

// Route-specific validation schemas
const appendNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  contentToAppend: z.string().min(1, 'Content to append is required').max(50000, 'Content too long'),
});

export function createNotesRouter(db: Database, notesRepo: OrganizedNotesRepository): ExpressRouter {
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

  // POST /api/v1/notes/append - Append content to existing note or create new
  router.post(
    '/append',
    validateBody(appendNoteSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { title, contentToAppend } = req.body;

      const notesService = new NotesService(db);
      const updatedNote = await notesService.appendToNote(userId, title, contentToAppend);

      res.status(200).json(updatedNote);
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
