import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { BaseLLMProvider } from '../base-provider.js';
import type { Capture, Template, Tag } from 'types';
import type { TodaySheetInput } from '../types.js';

// Create a concrete implementation for testing protected methods
class TestLLMProvider extends BaseLLMProvider {
  // Expose protected methods for testing
  public testBuildSystemPrompt(): string {
    return this.buildSystemPrompt();
  }

  public testBuildOrganizePrompt(
    captures: Capture[],
    template: Template,
    tags?: Tag[],
    includeDescriptions?: boolean
  ): string {
    return this.buildOrganizePrompt(captures, template, tags, includeDescriptions);
  }

  public testBuildTaskExtractionPrompt(text: string): string {
    return this.buildTaskExtractionPrompt(text);
  }

  public testBuildTodaySheetPrompt(input: TodaySheetInput): string {
    return this.buildTodaySheetPrompt(input);
  }

  public testParseResponse<T>(response: string, schema?: z.ZodSchema<T>): T {
    return this.parseResponse(response, schema);
  }
}

// Test fixtures
const createMockCapture = (overrides: Partial<Capture> = {}): Capture => ({
  id: 'capture-1',
  content: 'Test capture content',
  timestamp: new Date('2025-01-15T10:00:00Z'),
  metadata: null,
  userId: 'user-1',
  organized: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

const createMockTemplate = (overrides: Partial<Template> = {}): Template => ({
  id: 'template-1',
  name: 'Test Template',
  prompt: 'Organize by topic and extract todos.',
  isActive: true,
  userId: 'user-1',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 'tag-1',
  name: 'work',
  description: null,
  userId: 'user-1',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('BaseLLMProvider', () => {
  const provider = new TestLLMProvider();

  describe('buildSystemPrompt', () => {
    it('should return a system prompt for task extraction', () => {
      const prompt = provider.testBuildSystemPrompt();

      expect(prompt).toContain('AI assistant');
      expect(prompt).toContain('extract');
      expect(prompt).toContain('tasks');
      expect(prompt).toContain('template');
    });
  });

  describe('buildOrganizePrompt', () => {
    it('should include all captures with timestamps', () => {
      const captures = [
        createMockCapture({ content: 'First capture' }),
        createMockCapture({ id: 'capture-2', content: 'Second capture' }),
      ];
      const template = createMockTemplate();

      const prompt = provider.testBuildOrganizePrompt(captures, template);

      expect(prompt).toContain('First capture');
      expect(prompt).toContain('Second capture');
      expect(prompt).toContain('2 captured notes');
    });

    it('should include template prompt', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate({ prompt: 'Custom organization rules here' });

      const prompt = provider.testBuildOrganizePrompt(captures, template);

      expect(prompt).toContain('Custom organization rules here');
    });

    it('should request todos extraction', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();

      const prompt = provider.testBuildOrganizePrompt(captures, template);

      expect(prompt).toContain('extract todos');
    });

    it('should include tags when provided', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();
      const tags = [
        createMockTag({ name: 'work' }),
        createMockTag({ id: 'tag-2', name: 'personal' }),
      ];

      const prompt = provider.testBuildOrganizePrompt(captures, template, tags);

      expect(prompt).toContain('work');
      expect(prompt).toContain('personal');
      expect(prompt).toContain('Use the following tags to categorize todos');
    });

    it('should include tag descriptions when includeDescriptions is true', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();
      const tags = [
        createMockTag({ name: 'work', description: 'Work-related tasks' }),
        createMockTag({ id: 'tag-2', name: 'personal', description: 'Personal items' }),
      ];

      const prompt = provider.testBuildOrganizePrompt(captures, template, tags, true);

      expect(prompt).toContain('work (Work-related tasks)');
      expect(prompt).toContain('personal (Personal items)');
    });

    it('should not include tag descriptions when includeDescriptions is false', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();
      const tags = [
        createMockTag({ name: 'work', description: 'Work-related tasks' }),
      ];

      const prompt = provider.testBuildOrganizePrompt(captures, template, tags, false);

      expect(prompt).toContain('work');
      expect(prompt).not.toContain('Work-related tasks');
    });

    it('should use default categorization instruction when no tags provided', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();

      const prompt = provider.testBuildOrganizePrompt(captures, template);

      expect(prompt).toContain('Use your best judgment to categorize todos');
    });

    it('should use default categorization instruction when tags array is empty', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();

      const prompt = provider.testBuildOrganizePrompt(captures, template, []);

      expect(prompt).toContain('Use your best judgment to categorize todos');
    });

    it('should request JSON output', () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();

      const prompt = provider.testBuildOrganizePrompt(captures, template);

      expect(prompt).toContain('Return valid JSON only');
    });
  });

  describe('buildTaskExtractionPrompt', () => {
    it('should include the input text', () => {
      const text = 'Buy groceries tomorrow';

      const prompt = provider.testBuildTaskExtractionPrompt(text);

      expect(prompt).toContain('Buy groceries tomorrow');
    });

    it('should request JSON output format', () => {
      const text = 'Some task';

      const prompt = provider.testBuildTaskExtractionPrompt(text);

      expect(prompt).toContain('Return valid JSON only');
      expect(prompt).toContain('"todos"');
      expect(prompt).toContain('"content"');
      expect(prompt).toContain('"dueDate"');
    });
  });

  describe('buildTodaySheetPrompt', () => {
    const createTodaySheetInput = (overrides: Partial<TodaySheetInput> = {}): TodaySheetInput => ({
      captures: [createMockCapture()],
      existingTodos: [],
      feedbackTodos: [],
      template: createMockTemplate(),
      context: {
        currentTimeOfDay: 9,
        workingHoursMinutes: 480,
        currentDate: '2025-01-15',
      },
      ...overrides,
    });

    it('should include context information', () => {
      const input = createTodaySheetInput();

      const prompt = provider.testBuildTodaySheetPrompt(input);

      expect(prompt).toContain('Current time: 9:00');
      expect(prompt).toContain('480 minutes');
      expect(prompt).toContain('2025-01-15');
    });

    it('should list captures with IDs', () => {
      const input = createTodaySheetInput({
        captures: [
          createMockCapture({ id: 'uuid-123', content: 'Review PR' }),
        ],
      });

      const prompt = provider.testBuildTodaySheetPrompt(input);

      expect(prompt).toContain('uuid-123');
      expect(prompt).toContain('Review PR');
    });

    it('should include tags when provided', () => {
      const input = createTodaySheetInput({
        tags: [
          createMockTag({ name: 'urgent' }),
          createMockTag({ id: 'tag-2', name: 'meeting' }),
        ],
      });

      const prompt = provider.testBuildTodaySheetPrompt(input);

      expect(prompt).toContain('urgent');
      expect(prompt).toContain('meeting');
    });

    it('should include tag descriptions when includeDescriptions is true', () => {
      const input = createTodaySheetInput({
        tags: [
          createMockTag({ name: 'urgent', description: 'High priority items' }),
        ],
        includeDescriptions: true,
      });

      const prompt = provider.testBuildTodaySheetPrompt(input);

      expect(prompt).toContain('urgent (High priority items)');
    });

    it('should define all four sections', () => {
      const input = createTodaySheetInput();

      const prompt = provider.testBuildTodaySheetPrompt(input);

      expect(prompt).toContain('must_do_today');
      expect(prompt).toContain('likely_today');
      expect(prompt).toContain('opportunistic');
      expect(prompt).toContain('overflow');
    });

    it('should include user template prompt', () => {
      const input = createTodaySheetInput({
        template: createMockTemplate({ prompt: 'Prioritize meetings first' }),
      });

      const prompt = provider.testBuildTodaySheetPrompt(input);

      expect(prompt).toContain('Prioritize meetings first');
    });
  });

  describe('parseResponse', () => {
    it('should parse valid JSON', () => {
      const json = '{"notes": [], "todos": []}';

      const result = provider.testParseResponse(json);

      expect(result).toEqual({ notes: [], todos: [] });
    });

    it('should extract JSON from markdown code blocks', () => {
      const response = '```json\n{"notes": [{"content": "test"}], "todos": []}\n```';

      const result = provider.testParseResponse(response);

      expect(result).toEqual({ notes: [{ content: 'test' }], todos: [] });
    });

    it('should handle JSON with surrounding whitespace', () => {
      const json = '  \n{"key": "value"}\n  ';

      const result = provider.testParseResponse(json);

      expect(result).toEqual({ key: 'value' });
    });

    it('should throw on invalid JSON', () => {
      const invalid = 'not valid json';

      expect(() => provider.testParseResponse(invalid)).toThrow('Failed to parse LLM response');
    });

    it('should throw on incomplete JSON', () => {
      const incomplete = '{"notes": [';

      expect(() => provider.testParseResponse(incomplete)).toThrow('Failed to parse LLM response');
    });

    it('should validate against schema when provided', () => {
      const schema = z.object({
        notes: z.array(z.object({ content: z.string() })),
        todos: z.array(z.object({ content: z.string() })),
      });
      const validJson = '{"notes": [{"content": "note"}], "todos": []}';

      const result = provider.testParseResponse(validJson, schema);

      expect(result).toEqual({ notes: [{ content: 'note' }], todos: [] });
    });

    it('should throw on schema validation failure', () => {
      const schema = z.object({
        notes: z.array(z.object({ content: z.string() })),
        todos: z.array(z.object({ content: z.string() })),
      });
      const invalidJson = '{"notes": "not an array", "todos": []}';

      expect(() => provider.testParseResponse(invalidJson, schema)).toThrow(
        'LLM response validation failed'
      );
    });

    it('should throw when required field is missing per schema', () => {
      const schema = z.object({
        notes: z.array(z.object({ content: z.string() })),
        todos: z.array(z.object({ content: z.string() })),
      });
      const missingField = '{"notes": []}';

      expect(() => provider.testParseResponse(missingField, schema)).toThrow(
        'LLM response validation failed'
      );
    });

    it('should parse complex nested structures', () => {
      const complexJson = JSON.stringify({
        summary: 'Focus on code review',
        sections: {
          must_do_today: [{ title: 'Review PR', timeEstimate: 'medium' }],
          likely_today: [],
          opportunistic: [],
          overflow: [],
        },
        totalEstimatedMinutes: 45,
      });

      const result = provider.testParseResponse(complexJson) as {
        summary: string;
        sections: { must_do_today: unknown[] };
      };

      expect(result.summary).toBe('Focus on code review');
      expect(result.sections.must_do_today).toHaveLength(1);
    });
  });
});
