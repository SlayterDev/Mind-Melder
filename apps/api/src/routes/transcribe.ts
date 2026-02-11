import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import { ProviderFactory } from 'llm';
import type { Database, SettingsRepository } from 'database';
import { OrganizedNotesRepository } from 'database';
import { ApiError } from '../middleware/index.js';
import { asyncHandler } from '../utils/async-handler.js';

const ALLOWED_MIME_TYPES = [
  'audio/mpeg',       // mp3
  'audio/mp4',        // m4a
  'audio/x-m4a',      // m4a (alternate)
  'audio/wav',        // wav
  'audio/x-wav',      // wav (alternate)
  'audio/webm',       // webm
  'video/webm',       // webm (video container with audio)
  'video/mp4',        // mp4
  'audio/ogg',        // ogg
  'audio/flac',       // flac
  'audio/x-flac',     // flac (alternate)
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, `Unsupported audio format: ${file.mimetype}. Supported: mp3, m4a, wav, webm, mp4, ogg, flac`));
    }
  },
});

export function createTranscribeRouter(db: Database, settingsRepo: SettingsRepository): ExpressRouter {
  const router = Router();
  const notesRepo = new OrganizedNotesRepository(db);

  // POST /api/v1/transcribe - Upload audio for transcription
  router.post(
    '/',
    upload.single('audio'),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      if (!req.file) {
        throw new ApiError(400, 'No audio file provided. Send a multipart form with an "audio" field.');
      }

      // Validate provider supports transcription before accepting
      const settings = await settingsRepo.getOrCreate(userId);
      const provider = ProviderFactory.createFromSettings(settings);

      // Quick check: try to detect unsupported providers early
      if (settings.llmProvider !== 'openai') {
        throw new ApiError(400, `Transcription is not supported by the ${settings.llmProvider} provider. Please switch to OpenAI.`);
      }

      const audioBuffer = req.file.buffer;

      // Return 202 immediately, run transcription in background
      res.status(202).json({ success: true, message: 'Transcription started' });

      // Fire-and-forget background work
      (async () => {
        try {
          console.log(`[Transcribe] Starting transcription for user ${userId}, file ${req.file?.originalname}`);
          const result = await provider.transcribe(audioBuffer);
          console.log(`[Transcribe] Transcription completed for user ${userId}, file ${req.file?.originalname}`);

          const dateStr = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });

          await notesRepo.create({
            userId,
            title: `Transcription - ${dateStr}`,
            content: result.text,
            tags: ['transcription'],
          });
          console.log(`[Transcribe] Transcription saved for user ${userId}, file ${req.file?.originalname}`);
        } catch (err) {
          console.error('[transcribe] Background transcription failed:', err);
        }
      })();
    })
  );

  return router;
}
