import { Router } from 'express';
import { z } from 'zod';
import type { Database, SettingsRepository, TemplatesRepository } from 'database';
import { ProviderFactory } from 'llm';
import { WeeklyReviewService } from '../services/weekly-review-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, validateQuery, ApiError } from '../middleware/index.js';

// Validation schemas
const generateReviewSchema = z.object({
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // ISO date format YYYY-MM-DD
  forceRegenerate: z.boolean().optional().default(false),
});

const listReviewsSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const templateSuggestionsSchema = z.object({
  templateId: z.string().uuid(),
});

export function createWeeklyReviewRouter(db: Database, settingsRepo: SettingsRepository, templatesRepo: TemplatesRepository): Router {
  const router = Router();

  // POST /api/v1/weekly-review/generate - Generate a weekly review
  router.post(
    '/generate',
    validateBody(generateReviewSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { weekStartDate, forceRegenerate } = req.body;

      try {
        const settings = await settingsRepo.getOrCreate(userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const weeklyReviewService = new WeeklyReviewService(db, llmProvider);
        const review = await weeklyReviewService.generateReview(userId, weekStartDate, forceRegenerate);

        res.status(200).json({
          success: true,
          review,
          message: `Generated weekly review for ${review.weekStartDate} - ${review.weekEndDate}`,
        });
      } catch (error) {
        console.error('Weekly review generation error:', error);
        throw error;
      }
    })
  );

  // GET /api/v1/weekly-review/latest - Get the most recent weekly review
  router.get(
    '/latest',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);
      const weeklyReviewService = new WeeklyReviewService(db, llmProvider);
      const review = await weeklyReviewService.getLatestReview(userId);

      if (!review) {
        throw new ApiError(404, 'No weekly reviews found');
      }

      res.json(review);
    })
  );

  // GET /api/v1/weekly-review - List all weekly reviews with pagination
  router.get(
    '/',
    validateQuery(listReviewsSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { page, perPage } = req.query;

      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);
      const weeklyReviewService = new WeeklyReviewService(db, llmProvider);
      const reviews = await weeklyReviewService.listReviews(userId, Number(page), Number(perPage));

      res.json({
        reviews,
        page: Number(page),
        perPage: Number(perPage),
      });
    })
  );

  // GET /api/v1/weekly-review/:id - Get a specific weekly review
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { id } = req.params;

      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);
      const weeklyReviewService = new WeeklyReviewService(db, llmProvider);
      const review = await weeklyReviewService.getReview(id, userId);

      if (!review) {
        throw new ApiError(404, 'Weekly review not found');
      }

      res.json(review);
    })
  );

  // POST /api/v1/weekly-review/template-suggestions - Generate template improvement suggestions
  router.post(
    '/template-suggestions',
    validateBody(templateSuggestionsSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { templateId } = req.body;

      // Get the template
      const template = await templatesRepo.findById(templateId);
      if (!template) {
        throw new ApiError(404, 'Template not found');
      }

      // Verify user owns the template
      if (template.userId !== userId) {
        throw new ApiError(403, 'Unauthorized');
      }

      // Get the latest weekly review for context (optional)
      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);
      const weeklyReviewService = new WeeklyReviewService(db, llmProvider);
      const latestReview = await weeklyReviewService.getLatestReview(userId);

      // Generate suggestions
      const weeklyReviewOutput = latestReview ? {
        summary: latestReview.summary,
        insights: latestReview.insights as any,
      } : undefined;

      const suggestions = await llmProvider.generateTemplateSuggestions(template, weeklyReviewOutput);

      res.json({
        success: true,
        suggestions: suggestions.suggestions,
      });
    })
  );

  return router;
}
