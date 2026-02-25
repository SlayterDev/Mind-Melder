import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodaySheetService } from '../today-sheet-service.js';
import type { LLMProvider, TodaySheetOutput } from 'llm';
import type { Capture, Template, Tag, Todo } from 'database';

// Mock repository method holders
const mockRepos = {
  captures: {
    findUnorganized: vi.fn(),
    markAsOrganized: vi.fn(),
  },
  todos: {
    findByStatus: vi.fn(),
    findWithFeedback: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    removeFromTodaySheet: vi.fn(),
    removeCompletedFromTodaySheet: vi.fn(),
    findInTodaySheet: vi.fn(),
  },
  templates: {
    findById: vi.fn(),
    findActiveTemplate: vi.fn(),
  },
  todaySheets: {
    create: vi.fn(),
    findLatest: vi.fn(),
  },
  tags: {
    findByUserId: vi.fn(),
  },
};

vi.mock('database', () => {
  class MockCapturesRepository {
    findUnorganized = mockRepos.captures.findUnorganized;
    markAsOrganized = mockRepos.captures.markAsOrganized;
  }

  class MockTodosRepository {
    findByStatus = mockRepos.todos.findByStatus;
    findWithFeedback = mockRepos.todos.findWithFeedback;
    findById = mockRepos.todos.findById;
    create = mockRepos.todos.create;
    update = mockRepos.todos.update;
    removeFromTodaySheet = mockRepos.todos.removeFromTodaySheet;
    removeCompletedFromTodaySheet = mockRepos.todos.removeCompletedFromTodaySheet;
    findInTodaySheet = mockRepos.todos.findInTodaySheet;
  }

  class MockTemplatesRepository {
    findById = mockRepos.templates.findById;
    findActiveTemplate = mockRepos.templates.findActiveTemplate;
  }

  class MockTodaySheetsRepository {
    create = mockRepos.todaySheets.create;
    findLatest = mockRepos.todaySheets.findLatest;
  }

  class MockTagsRepository {
    findByUserId = mockRepos.tags.findByUserId;
  }

  return {
    CapturesRepository: MockCapturesRepository,
    TodosRepository: MockTodosRepository,
    TemplatesRepository: MockTemplatesRepository,
    TodaySheetsRepository: MockTodaySheetsRepository,
    TagsRepository: MockTagsRepository,
  };
});

// Test fixtures
const userId = 'user-1';

const createMockCapture = (overrides: Partial<Capture> = {}): Capture => ({
  id: 'capture-1',
  content: 'Original capture text',
  timestamp: new Date('2025-01-15T10:00:00Z'),
  metadata: null,
  userId,
  organized: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-existing-1',
  content: 'Existing todo',
  description: null,
  status: 'pending',
  dueDate: null,
  completedAt: null,
  userId,
  tags: [],
  todaySheetSection: 'none',
  todaySheetOrder: null,
  todaySheetId: null,
  timeEstimate: 'none',
  priorityScore: 50,
  captureId: null,
  feedbackVote: 'none',
  feedbackText: null,
  feedbackTimestamp: null,
  createdAt: new Date('2025-01-15T09:00:00Z'),
  updatedAt: new Date('2025-01-15T09:00:00Z'),
  ...overrides,
});

const createMockTemplate = (overrides: Partial<Template> = {}): Template => ({
  id: 'template-1',
  name: 'Test Template',
  prompt: 'Organize by priority.',
  isActive: true,
  userId,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

const createMockTodaySheetRecord = () => ({
  id: 'sheet-record-1',
  userId,
  summary: 'Today plan',
  capturesProcessed: 1,
  todosIncluded: 0,
  totalEstimatedMinutes: 45,
  generatedAt: new Date('2025-01-15T08:00:00Z'),
  createdAt: new Date('2025-01-15T08:00:00Z'),
  updatedAt: new Date('2025-01-15T08:00:00Z'),
});

const createMockAiResult = (overrides: Partial<TodaySheetOutput> = {}): TodaySheetOutput => ({
  summary: 'Focus on critical tasks today.',
  sections: {
    must_do_today: [],
    likely_today: [],
    opportunistic: [],
    overflow: [],
  },
  totalEstimatedMinutes: 0,
  ...overrides,
});

const createMockTaskItem = (overrides: Partial<TodaySheetOutput['sections']['must_do_today'][0]> = {}) => ({
  title: 'Review PR',
  description: 'Look at the open PR',
  timeEstimate: 'medium' as const,
  priorityScore: 80,
  tags: ['work'],
  sourceType: 'capture' as const,
  sourceId: 'capture-1',
  dueDate: '2025-01-15',
  ...overrides,
});

describe('TodaySheetService', () => {
  let service: TodaySheetService;
  let mockLLMProvider: LLMProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLLMProvider = {
      organize: vi.fn(),
      extractTasks: vi.fn(),
      generateTodaySheet: vi.fn(),
      streamChat: vi.fn(),
      generateTitle: vi.fn(),
      refineNote: vi.fn(),
      transcribe: vi.fn(),
      generateWeeklyReview: vi.fn(),
      generateTemplateSuggestions: vi.fn(),
      lastUsage: null,
    };

    service = new TodaySheetService({} as never, mockLLMProvider);

    // Default happy-path mock returns
    mockRepos.captures.findUnorganized.mockResolvedValue([createMockCapture()]);
    mockRepos.todos.findByStatus.mockResolvedValue([]);
    mockRepos.todos.findWithFeedback.mockResolvedValue([]);
    mockRepos.templates.findActiveTemplate.mockResolvedValue(createMockTemplate());
    mockRepos.tags.findByUserId.mockResolvedValue([]);
    mockRepos.todaySheets.create.mockResolvedValue(createMockTodaySheetRecord());
    mockRepos.todos.removeFromTodaySheet.mockResolvedValue(undefined);
    mockRepos.todos.removeCompletedFromTodaySheet.mockResolvedValue(undefined);
    mockRepos.captures.markAsOrganized.mockResolvedValue(undefined);
    mockRepos.todos.create.mockResolvedValue(createMockTodo({ id: 'new-todo-1', content: 'Review PR' }));
    mockRepos.todos.update.mockResolvedValue(createMockTodo({ id: 'todo-existing-1', todaySheetSection: 'must_do_today' }));
    mockRepos.todos.findById.mockResolvedValue(undefined);
    (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockAiResult()
    );
  });

  describe('generateSheet', () => {
    it('should create new todos from capture-sourced items', async () => {
      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [createMockTaskItem({ sourceType: 'capture', sourceId: 'capture-1' })],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
          totalEstimatedMinutes: 45,
        })
      );

      const result = await service.generateSheet(userId);

      expect(mockRepos.todos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          content: 'Review PR',
          description: 'Look at the open PR',
          todaySheetSection: 'must_do_today',
          captureId: 'capture-1',
        })
      );
      expect(result.sections.must_do_today).toHaveLength(1);
    });

    it('should update an existing todo when sourceType is todo', async () => {
      const existingTodo = createMockTodo({ id: 'todo-existing-1' });
      mockRepos.todos.findByStatus.mockResolvedValue([existingTodo]);
      mockRepos.todos.findById.mockResolvedValue(existingTodo);

      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [
              createMockTaskItem({ sourceType: 'todo', sourceId: 'todo-existing-1', title: 'Updated title' }),
            ],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
        })
      );

      await service.generateSheet(userId);

      expect(mockRepos.todos.findById).toHaveBeenCalledWith('todo-existing-1');
      expect(mockRepos.todos.update).toHaveBeenCalledWith(
        'todo-existing-1',
        expect.objectContaining({
          todaySheetSection: 'must_do_today',
          content: 'Updated title',
        })
      );
      expect(mockRepos.todos.create).not.toHaveBeenCalled();
    });

    it('should use provided templateId when specified', async () => {
      const customTemplate = createMockTemplate({ id: 'custom-template' });
      mockRepos.templates.findById.mockResolvedValue(customTemplate);

      await service.generateSheet(userId, 'custom-template');

      expect(mockRepos.templates.findById).toHaveBeenCalledWith('custom-template');
      expect(mockRepos.templates.findActiveTemplate).not.toHaveBeenCalled();
    });

    it('should fall back to active template when no templateId provided', async () => {
      const activeTemplate = createMockTemplate({ isActive: true });
      mockRepos.templates.findActiveTemplate.mockResolvedValue(activeTemplate);

      await service.generateSheet(userId);

      expect(mockRepos.templates.findActiveTemplate).toHaveBeenCalledWith(userId);
    });

    it('should fall back to default template when no active template exists', async () => {
      mockRepos.templates.findActiveTemplate.mockResolvedValue(undefined);

      await service.generateSheet(userId);

      expect(mockLLMProvider.generateTodaySheet).toHaveBeenCalledWith(
        expect.objectContaining({
          template: expect.objectContaining({ id: 'default', name: 'Default Template' }),
        })
      );
    });

    it('should throw when provided templateId is not found', async () => {
      mockRepos.templates.findById.mockResolvedValue(undefined);

      await expect(service.generateSheet(userId, 'nonexistent')).rejects.toThrow(
        'Template not found or unauthorized'
      );
    });

    it('should throw when template belongs to a different user', async () => {
      mockRepos.templates.findById.mockResolvedValue(
        createMockTemplate({ id: 'other-template', userId: 'other-user' })
      );

      await expect(service.generateSheet(userId, 'other-template')).rejects.toThrow(
        'Template not found or unauthorized'
      );
    });

    it('should skip items with an invalid capture sourceId (hallucinated by LLM)', async () => {
      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [
              createMockTaskItem({ sourceType: 'capture', sourceId: 'hallucinated-id-999' }),
            ],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
        })
      );

      const result = await service.generateSheet(userId);

      expect(mockRepos.todos.create).not.toHaveBeenCalled();
      expect(result.sections.must_do_today).toHaveLength(0);
    });

    it('should skip items with an invalid todo sourceId (hallucinated by LLM)', async () => {
      mockRepos.todos.findByStatus.mockResolvedValue([]);

      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [
              createMockTaskItem({ sourceType: 'todo', sourceId: 'hallucinated-todo-id' }),
            ],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
        })
      );

      const result = await service.generateSheet(userId);

      expect(mockRepos.todos.create).not.toHaveBeenCalled();
      expect(result.sections.must_do_today).toHaveLength(0);
    });

    it('should mark all captures as organized after generation', async () => {
      const captures = [
        createMockCapture({ id: 'capture-1' }),
        createMockCapture({ id: 'capture-2' }),
      ];
      mockRepos.captures.findUnorganized.mockResolvedValue(captures);

      await service.generateSheet(userId);

      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledTimes(2);
      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledWith('capture-1');
      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledWith('capture-2');
    });

    it('should use original capture content as title when content lock is enabled', async () => {
      const capture = createMockCapture({ id: 'capture-1', content: 'Raw note: need to buy milk' });
      mockRepos.captures.findUnorganized.mockResolvedValue([capture]);

      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [
              createMockTaskItem({
                sourceType: 'capture',
                sourceId: 'capture-1',
                title: 'Buy milk from grocery store',
              }),
            ],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
        })
      );

      await service.generateSheet(userId, undefined, true);

      expect(mockRepos.todos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Raw note: need to buy milk', // original capture content, not AI title
        })
      );
    });

    it('should preserve existing todo title when content lock is enabled', async () => {
      const existingTodo = createMockTodo({
        id: 'todo-existing-1',
        content: 'Original todo title',
        description: 'Original description',
      });
      mockRepos.todos.findByStatus.mockResolvedValue([existingTodo]);
      mockRepos.todos.findById.mockResolvedValue(existingTodo);

      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [
              createMockTaskItem({
                sourceType: 'todo',
                sourceId: 'todo-existing-1',
                title: 'AI-rewritten title',
                description: 'AI description',
              }),
            ],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
        })
      );

      await service.generateSheet(userId, undefined, true);

      expect(mockRepos.todos.update).toHaveBeenCalledWith(
        'todo-existing-1',
        expect.not.objectContaining({ content: 'AI-rewritten title' })
      );
      // Description should not be overwritten since todo already has one
      expect(mockRepos.todos.update).toHaveBeenCalledWith(
        'todo-existing-1',
        expect.not.objectContaining({ description: 'AI description' })
      );
    });

    it('should wrap LLM validation errors with a user-friendly message', async () => {
      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('LLM response validation failed: unexpected format')
      );

      await expect(service.generateSheet(userId)).rejects.toThrow(
        'AI returned invalid response format. Please try again.'
      );
    });

    it('should re-throw non-validation LLM errors as-is', async () => {
      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(service.generateSheet(userId)).rejects.toThrow('Network timeout');
    });

    it('should return the correct summary and metadata', async () => {
      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({ summary: 'Today focus: ship the feature.', totalEstimatedMinutes: 120 })
      );

      const result = await service.generateSheet(userId);

      expect(result.summary).toBe('Today focus: ship the feature.');
      expect(result.totalEstimatedMinutes).toBe(120);
      expect(result.capturesProcessed).toBe(1);
    });

    it('should place items into the correct sections', async () => {
      (mockLLMProvider.generateTodaySheet as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockAiResult({
          sections: {
            must_do_today: [createMockTaskItem({ sourceType: 'capture', sourceId: 'capture-1', title: 'Critical task' })],
            likely_today: [],
            opportunistic: [],
            overflow: [],
          },
        })
      );
      mockRepos.todos.create.mockResolvedValue(createMockTodo({ content: 'Critical task', todaySheetSection: 'must_do_today' }));

      const result = await service.generateSheet(userId);

      expect(result.sections.must_do_today).toHaveLength(1);
      expect(result.sections.likely_today).toHaveLength(0);
    });
  });

  describe('getSheet', () => {
    it('should return null when no todos are in today sheet', async () => {
      mockRepos.todos.findInTodaySheet.mockResolvedValue([]);

      const result = await service.getSheet(userId);

      expect(result).toBeNull();
    });

    it('should group todos by section', async () => {
      const sheetTodos = [
        createMockTodo({ id: 'todo-1', todaySheetSection: 'must_do_today', todaySheetOrder: 0 }),
        createMockTodo({ id: 'todo-2', todaySheetSection: 'must_do_today', todaySheetOrder: 1 }),
        createMockTodo({ id: 'todo-3', todaySheetSection: 'likely_today', todaySheetOrder: 0 }),
        createMockTodo({ id: 'todo-4', todaySheetSection: 'overflow', todaySheetOrder: 0 }),
      ];
      mockRepos.todos.findInTodaySheet.mockResolvedValue(sheetTodos);
      mockRepos.todaySheets.findLatest.mockResolvedValue(createMockTodaySheetRecord());

      const result = await service.getSheet(userId);

      expect(result).not.toBeNull();
      expect(result!.sections.must_do_today).toHaveLength(2);
      expect(result!.sections.likely_today).toHaveLength(1);
      expect(result!.sections.opportunistic).toHaveLength(0);
      expect(result!.sections.overflow).toHaveLength(1);
    });

    it('should calculate total estimated minutes from time estimates', async () => {
      const sheetTodos = [
        createMockTodo({ id: 'todo-1', todaySheetSection: 'must_do_today', timeEstimate: 'quick' }),   // 10 min
        createMockTodo({ id: 'todo-2', todaySheetSection: 'must_do_today', timeEstimate: 'medium' }),  // 45 min
        createMockTodo({ id: 'todo-3', todaySheetSection: 'likely_today', timeEstimate: 'long' }),     // 90 min
        createMockTodo({ id: 'todo-4', todaySheetSection: 'likely_today', timeEstimate: 'none' }),     // 0 min
      ];
      mockRepos.todos.findInTodaySheet.mockResolvedValue(sheetTodos);
      mockRepos.todaySheets.findLatest.mockResolvedValue(createMockTodaySheetRecord());

      const result = await service.getSheet(userId);

      expect(result!.totalEstimatedMinutes).toBe(145); // 10 + 45 + 90 + 0
    });

    it('should use the latest sheet summary', async () => {
      mockRepos.todos.findInTodaySheet.mockResolvedValue([createMockTodo({ todaySheetSection: 'must_do_today' })]);
      mockRepos.todaySheets.findLatest.mockResolvedValue({
        ...createMockTodaySheetRecord(),
        summary: 'Today plan: finish the feature.',
      });

      const result = await service.getSheet(userId);

      expect(result!.summary).toBe('Today plan: finish the feature.');
    });

    it('should use empty summary when no latest sheet record exists', async () => {
      mockRepos.todos.findInTodaySheet.mockResolvedValue([createMockTodo({ todaySheetSection: 'must_do_today' })]);
      mockRepos.todaySheets.findLatest.mockResolvedValue(undefined);

      const result = await service.getSheet(userId);

      expect(result!.summary).toBe('');
    });
  });
});
