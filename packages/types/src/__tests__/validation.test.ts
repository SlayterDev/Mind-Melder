import { describe, it, expect } from 'vitest';
import {
  createCaptureSchema,
  createOrganizedNoteSchema,
  updateOrganizedNoteSchema,
  createTodoSchema,
  updateTodoSchema,
  timeEstimateSchema,
  createTemplateSchema,
  updateTemplateSchema,
  llmProviderSchema,
  updateSettingsSchema,
  createTagSchema,
  updateTagSchema,
  feedbackVoteSchema,
  submitFeedbackSchema,
} from '../validation.js';

describe('Validation Schemas', () => {
  describe('createCaptureSchema', () => {
    it('should accept valid capture input', () => {
      const result = createCaptureSchema.safeParse({
        content: 'This is a valid capture',
      });
      expect(result.success).toBe(true);
    });

    it('should accept capture with metadata', () => {
      const result = createCaptureSchema.safeParse({
        content: 'Capture with metadata',
        metadata: { source: 'mobile', tags: ['work'] },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({ source: 'mobile', tags: ['work'] });
      }
    });

    it('should reject empty content', () => {
      const result = createCaptureSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Content is required');
      }
    });

    it('should reject content exceeding max length', () => {
      const result = createCaptureSchema.safeParse({
        content: 'a'.repeat(10001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Content too long');
      }
    });

    it('should reject missing content', () => {
      const result = createCaptureSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('createOrganizedNoteSchema', () => {
    it('should accept valid note input', () => {
      const result = createOrganizedNoteSchema.safeParse({
        title: 'My Note Title',
        content: 'This is a structured note',
      });
      expect(result.success).toBe(true);
    });

    it('should accept note with category and date', () => {
      const date = new Date();
      const result = createOrganizedNoteSchema.safeParse({
        title: 'Note Title',
        content: 'Note with category',
        category: 'work',
        date,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('work');
        expect(result.data.date).toEqual(date);
      }
    });

    it('should reject missing title', () => {
      const result = createOrganizedNoteSchema.safeParse({
        content: 'Content without title',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = createOrganizedNoteSchema.safeParse({
        title: '',
        content: 'Valid content',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title is required');
      }
    });

    it('should reject title exceeding max length', () => {
      const result = createOrganizedNoteSchema.safeParse({
        title: 'a'.repeat(201),
        content: 'Valid content',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Title too long');
      }
    });

    it('should reject empty content', () => {
      const result = createOrganizedNoteSchema.safeParse({
        title: 'Valid title',
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject content exceeding max length', () => {
      const result = createOrganizedNoteSchema.safeParse({
        title: 'Valid title',
        content: 'a'.repeat(50001),
      });
      expect(result.success).toBe(false);
    });

    it('should reject category exceeding max length', () => {
      const result = createOrganizedNoteSchema.safeParse({
        title: 'Valid title',
        content: 'Valid content',
        category: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateOrganizedNoteSchema', () => {
    it('should accept partial updates', () => {
      const result = updateOrganizedNoteSchema.safeParse({
        category: 'personal',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateOrganizedNoteSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('createTodoSchema', () => {
    it('should accept valid todo input', () => {
      const result = createTodoSchema.safeParse({
        content: 'Complete the task',
      });
      expect(result.success).toBe(true);
    });

    it('should accept todo with due date', () => {
      const result = createTodoSchema.safeParse({
        content: 'Complete by tomorrow',
        dueDate: '2025-01-15T10:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = createTodoSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Content is required');
      }
    });

    it('should reject content exceeding max length', () => {
      const result = createTodoSchema.safeParse({
        content: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Content too long');
      }
    });

    it('should reject invalid date format', () => {
      const result = createTodoSchema.safeParse({
        content: 'Valid content',
        dueDate: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateTodoSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTodoSchema.safeParse({
        status: 'completed',
      });
      expect(result.success).toBe(true);
    });

    it('should accept nullable due date', () => {
      const result = updateTodoSchema.safeParse({
        dueDate: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateTodoSchema.safeParse({
        status: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept description update', () => {
      const result = updateTodoSchema.safeParse({
        description: 'Additional details about the task',
      });
      expect(result.success).toBe(true);
    });

    it('should reject description exceeding max length', () => {
      const result = updateTodoSchema.safeParse({
        description: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('timeEstimateSchema', () => {
    it('should accept valid time estimates', () => {
      expect(timeEstimateSchema.safeParse('quick').success).toBe(true);
      expect(timeEstimateSchema.safeParse('medium').success).toBe(true);
      expect(timeEstimateSchema.safeParse('long').success).toBe(true);
      expect(timeEstimateSchema.safeParse('none').success).toBe(true);
    });

    it('should reject invalid time estimate', () => {
      const result = timeEstimateSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('createTemplateSchema', () => {
    it('should accept valid template input', () => {
      const result = createTemplateSchema.safeParse({
        name: 'My Template',
        prompt: 'Organize notes by topic and extract action items.',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createTemplateSchema.safeParse({
        name: '',
        prompt: 'Valid prompt text here',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name is required');
      }
    });

    it('should reject prompt too short', () => {
      const result = createTemplateSchema.safeParse({
        name: 'My Template',
        prompt: 'Short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Prompt must be at least 10 characters');
      }
    });

    it('should reject name exceeding max length', () => {
      const result = createTemplateSchema.safeParse({
        name: 'a'.repeat(201),
        prompt: 'Valid prompt text here',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name too long');
      }
    });

    it('should reject prompt exceeding max length', () => {
      const result = createTemplateSchema.safeParse({
        name: 'Valid name',
        prompt: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Prompt too long');
      }
    });
  });

  describe('updateTemplateSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTemplateSchema.safeParse({
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateTemplateSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('llmProviderSchema', () => {
    it('should accept valid providers', () => {
      expect(llmProviderSchema.safeParse('openai').success).toBe(true);
      expect(llmProviderSchema.safeParse('anthropic').success).toBe(true);
      expect(llmProviderSchema.safeParse('ollama').success).toBe(true);
    });

    it('should reject invalid provider', () => {
      const result = llmProviderSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('updateSettingsSchema', () => {
    it('should accept valid settings update', () => {
      const result = updateSettingsSchema.safeParse({
        llmProvider: 'openai',
        llmTemperature: 0.7,
        scheduleEnabled: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject temperature below minimum', () => {
      const result = updateSettingsSchema.safeParse({
        llmTemperature: -0.1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject temperature above maximum', () => {
      const result = updateSettingsSchema.safeParse({
        llmTemperature: 2.1,
      });
      expect(result.success).toBe(false);
    });

    it('should accept nullable llmModel', () => {
      const result = updateSettingsSchema.safeParse({
        llmModel: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL for ollamaBaseUrl', () => {
      const result = updateSettingsSchema.safeParse({
        ollamaBaseUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid ollamaBaseUrl', () => {
      const result = updateSettingsSchema.safeParse({
        ollamaBaseUrl: 'http://localhost:11434',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createTagSchema', () => {
    it('should accept valid tag input', () => {
      const result = createTagSchema.safeParse({
        name: 'work',
      });
      expect(result.success).toBe(true);
    });

    it('should accept tag with description', () => {
      const result = createTagSchema.safeParse({
        name: 'personal',
        description: 'Personal tasks and notes',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = createTagSchema.safeParse({
        name: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name is required');
      }
    });

    it('should reject name exceeding max length', () => {
      const result = createTagSchema.safeParse({
        name: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name too long');
      }
    });

    it('should reject description exceeding max length', () => {
      const result = createTagSchema.safeParse({
        name: 'valid',
        description: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Description too long');
      }
    });
  });

  describe('updateTagSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTagSchema.safeParse({
        description: 'Updated description',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object', () => {
      const result = updateTagSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('feedbackVoteSchema', () => {
    it('should accept valid feedback votes', () => {
      expect(feedbackVoteSchema.safeParse('thumbs_up').success).toBe(true);
      expect(feedbackVoteSchema.safeParse('thumbs_down').success).toBe(true);
      expect(feedbackVoteSchema.safeParse('none').success).toBe(true);
    });

    it('should reject invalid feedback vote', () => {
      const result = feedbackVoteSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('submitFeedbackSchema', () => {
    it('should accept feedback with thumbs up', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'thumbs_up',
      });
      expect(result.success).toBe(true);
    });

    it('should accept feedback with thumbs down', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'thumbs_down',
      });
      expect(result.success).toBe(true);
    });

    it('should accept feedback with none', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'none',
      });
      expect(result.success).toBe(true);
    });

    it('should accept feedback with text', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'thumbs_down',
        feedbackText: 'Task is not clear enough',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.feedbackText).toBe('Task is not clear enough');
      }
    });

    it('should accept feedback without text', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'thumbs_up',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.feedbackText).toBeUndefined();
      }
    });

    it('should reject feedback text exceeding 100 characters', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'thumbs_down',
        feedbackText: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Feedback text must be 100 characters or less');
      }
    });

    it('should accept feedback text at exactly 100 characters', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'thumbs_down',
        feedbackText: 'a'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid vote', () => {
      const result = submitFeedbackSchema.safeParse({
        vote: 'invalid_vote',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing vote', () => {
      const result = submitFeedbackSchema.safeParse({
        feedbackText: 'Some feedback',
      });
      expect(result.success).toBe(false);
    });
  });
});
