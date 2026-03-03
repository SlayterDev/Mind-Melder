import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { Database, OrganizedNotesRepository, SettingsRepository } from 'database';
import { createOrganizedNoteSchema, updateOrganizedNoteSchema } from 'types';
import { ProviderFactory } from 'llm';
import type { TokenTrackingService } from '../services/token-tracking-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';
import { NotesService } from '../services/notes-service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('NotesRouter');

// Route-specific validation schemas
const appendNoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  contentToAppend: z.string().min(1, 'Content to append is required').max(50000, 'Content too long'),
});

const refineNoteSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
});

export function createNotesRouter(db: Database, notesRepo: OrganizedNotesRepository, settingsRepo: SettingsRepository, tokenTracker?: TokenTrackingService): ExpressRouter {
  const router = Router();

  // GET /api/v1/notes/titles - Get note titles (optional: filter by search query)
  router.get(
    '/titles',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { q } = req.query;

      let notes;
      if (q && typeof q === 'string') {
        // Search for matching titles
        notes = await notesRepo.search(userId, q);
      } else {
        // Return all notes
        notes = await notesRepo.findByUserId(userId);
      }

      // Extract unique titles only
      const titles = [...new Set(notes.map(note => note.title))];
      res.json({ titles });
    })
  );

  // GET /api/v1/notes - List notes (optional: filter by tag)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { tag } = req.query;

      let notes;
      if (tag && typeof tag === 'string') {
        notes = await notesRepo.findByTag(userId, tag);
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
      const { title, content, tags, date } = req.body;

      const note = await notesRepo.create({ userId, title, content, tags, date });
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
      const { title, content, tags } = req.body;

      const note = await notesRepo.update(id, { title, content, tags });
      if (!note) {
        throw new ApiError(404, 'Note not found');
      }

      res.json(note);
    })
  );

  // POST /api/v1/notes/:id/refine - Preview refined note content via LLM
  router.post(
    '/:id/refine',
    validateBody(refineNoteSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { id } = req.params;
      const { prompt } = req.body;

      const note = await notesRepo.findById(id);
      if (!note) {
        throw new ApiError(404, 'Note not found');
      }

      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);

      logger.info('Calling LLM provider for note refinement', { userId, noteId: id, provider: settings.llmProvider, model: settings.llmModel });

      const refined = await llmProvider.refineNote(note.title, note.content, prompt);

      if (tokenTracker && llmProvider.lastUsage) {
        tokenTracker.trackUsage(userId, settings.llmProvider, settings.llmModel || 'default', 'refine_note', llmProvider.lastUsage);
      }

      logger.debug('LLM provider returned refined content', { userId, noteId: id });

      res.json(refined);
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
