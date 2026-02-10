import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationService } from '../organization-service.js';
import type { Capture, Template, Tag } from 'types';
import type { LLMProvider, OrganizedOutput } from 'llm';

// Mock repository method holders - these get populated when service is instantiated
const mockRepos = {
  captures: {
    findUnorganized: vi.fn(),
    markAsOrganized: vi.fn(),
  },
  todos: {
    create: vi.fn(),
  },
  templates: {
    findById: vi.fn(),
    findActiveTemplate: vi.fn(),
  },
  tags: {
    findByUserId: vi.fn(),
  },
};

// Mock all database repositories with actual class definitions
vi.mock('database', () => {
  // Create classes that reference the mockRepos object
  class MockCapturesRepository {
    findUnorganized = mockRepos.captures.findUnorganized;
    markAsOrganized = mockRepos.captures.markAsOrganized;
  }

  class MockTodosRepository {
    create = mockRepos.todos.create;
  }

  class MockTemplatesRepository {
    findById = mockRepos.templates.findById;
    findActiveTemplate = mockRepos.templates.findActiveTemplate;
  }

  class MockTagsRepository {
    findByUserId = mockRepos.tags.findByUserId;
  }

  return {
    CapturesRepository: MockCapturesRepository,
    TodosRepository: MockTodosRepository,
    TemplatesRepository: MockTemplatesRepository,
    TagsRepository: MockTagsRepository,
  };
});

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

const createMockTodoItem = (overrides: Partial<OrganizedOutput['todos'][0]> = {}): OrganizedOutput['todos'][0] => ({
  title: 'Action item',
  timeEstimate: 'medium',
  priorityScore: 50,
  tags: [],
  sourceType: 'capture',
  sourceId: 'capture-1',
  dueDate: '2025-01-20',
  ...overrides,
});

const createMockLLMOutput = (overrides: Partial<OrganizedOutput> = {}): OrganizedOutput => ({
  todos: [createMockTodoItem()],
  ...overrides,
});

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockDb: object;
  let mockLLMProvider: LLMProvider;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock LLM provider
    mockLLMProvider = {
      organize: vi.fn(),
      extractTasks: vi.fn(),
      generateTodaySheet: vi.fn(),
      streamChat: vi.fn().mockResolvedValue(undefined),
      generateTitle: vi.fn().mockResolvedValue('Mock Title'),
    };

    // Create mock database
    mockDb = {};

    // Create service instance - this will instantiate the mocked repositories
    service = new OrganizationService(mockDb as never, mockLLMProvider);
  });

  describe('organizeCaptures', () => {
    const userId = 'user-1';

    it('should return early when no unorganized captures exist', async () => {
      mockRepos.captures.findUnorganized.mockResolvedValue([]);

      const result = await service.organizeCaptures(userId);

      expect(result).toEqual({
        capturesProcessed: 0,
        todosCount: 0,
      });
      expect(mockLLMProvider.organize).not.toHaveBeenCalled();
    });

    it('should use provided template ID', async () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate({ id: 'custom-template' });

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findById.mockResolvedValue(template);
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockLLMOutput({ todos: [] })
      );

      await service.organizeCaptures(userId, 'custom-template');

      expect(mockRepos.templates.findById).toHaveBeenCalledWith('custom-template');
      expect(mockLLMProvider.organize).toHaveBeenCalledWith(captures, template, []);
    });

    it('should throw error when provided template not found', async () => {
      const captures = [createMockCapture()];

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findById.mockResolvedValue(undefined);

      await expect(service.organizeCaptures(userId, 'nonexistent')).rejects.toThrow(
        'Template not found'
      );
    });

    it('should throw error when template belongs to different user', async () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate({ userId: 'other-user' });

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findById.mockResolvedValue(template);

      await expect(service.organizeCaptures(userId, template.id)).rejects.toThrow(
        'Template not found'
      );
    });

    it('should fall back to active template when no template ID provided', async () => {
      const captures = [createMockCapture()];
      const activeTemplate = createMockTemplate({ isActive: true });

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(activeTemplate);
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockLLMOutput({ todos: [] })
      );

      await service.organizeCaptures(userId);

      expect(mockRepos.templates.findActiveTemplate).toHaveBeenCalledWith(userId);
      expect(mockLLMProvider.organize).toHaveBeenCalledWith(captures, activeTemplate, []);
    });

    it('should fall back to default template when no active template exists', async () => {
      const captures = [createMockCapture()];

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(undefined);
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockLLMOutput({ todos: [] })
      );

      await service.organizeCaptures(userId);

      expect(mockLLMProvider.organize).toHaveBeenCalledWith(
        captures,
        expect.objectContaining({
          id: 'default',
          name: 'Default Template',
        }),
        []
      );
    });

    it('should pass user tags to LLM provider', async () => {
      const captures = [createMockCapture()];
      const template = createMockTemplate();
      const tags = [createMockTag({ name: 'work' }), createMockTag({ id: 'tag-2', name: 'personal' })];

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(template);
      mockRepos.tags.findByUserId.mockResolvedValue(tags);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockLLMOutput({ todos: [] })
      );

      await service.organizeCaptures(userId);

      expect(mockRepos.tags.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockLLMProvider.organize).toHaveBeenCalledWith(captures, template, tags);
    });

    it('should create todos from LLM response', async () => {
      const captures = [createMockCapture()];
      const llmOutput = createMockLLMOutput({
        todos: [
          createMockTodoItem({ title: 'Todo 1', dueDate: '2025-01-20' }),
          createMockTodoItem({ title: 'Todo 2', dueDate: undefined }),
        ],
      });

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(createMockTemplate());
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(llmOutput);
      mockRepos.todos.create.mockResolvedValue({});

      const result = await service.organizeCaptures(userId);

      expect(mockRepos.todos.create).toHaveBeenCalledTimes(2);
      expect(mockRepos.todos.create).toHaveBeenCalledWith({
        content: 'Todo 1',
        description: undefined,
        dueDate: expect.any(Date),
        timeEstimate: 'medium',
        priorityScore: 50,
        tags: [],
        userId,
      });
      expect(mockRepos.todos.create).toHaveBeenCalledWith({
        content: 'Todo 2',
        description: undefined,
        dueDate: undefined,
        timeEstimate: 'medium',
        priorityScore: 50,
        tags: [],
        userId,
      });
      expect(result.todosCount).toBe(2);
    });

    it('should mark all captures as organized', async () => {
      const captures = [
        createMockCapture({ id: 'capture-1' }),
        createMockCapture({ id: 'capture-2' }),
        createMockCapture({ id: 'capture-3' }),
      ];

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(createMockTemplate());
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(
        createMockLLMOutput({ todos: [] })
      );

      const result = await service.organizeCaptures(userId);

      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledTimes(3);
      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledWith('capture-1');
      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledWith('capture-2');
      expect(mockRepos.captures.markAsOrganized).toHaveBeenCalledWith('capture-3');
      expect(result.capturesProcessed).toBe(3);
    });

    it('should return correct counts in result', async () => {
      const captures = [createMockCapture(), createMockCapture({ id: 'capture-2' })];
      const llmOutput = createMockLLMOutput({
        todos: [createMockTodoItem({ title: 'Todo 1' })],
      });

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(createMockTemplate());
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(llmOutput);
      mockRepos.todos.create.mockResolvedValue({});

      const result = await service.organizeCaptures(userId);

      expect(result).toEqual({
        capturesProcessed: 2,
        todosCount: 1,
      });
    });

    it('should handle empty todos array gracefully', async () => {
      const captures = [createMockCapture()];
      const llmOutput = createMockLLMOutput({
        todos: [],
      });

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(createMockTemplate());
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(llmOutput);

      const result = await service.organizeCaptures(userId);

      expect(mockRepos.todos.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        capturesProcessed: 1,
        todosCount: 0,
      });
    });

    it('should handle undefined todos array gracefully', async () => {
      const captures = [createMockCapture()];
      const llmOutput = {
        todos: undefined as any, // Simulate malformed LLM response
      };

      mockRepos.captures.findUnorganized.mockResolvedValue(captures);
      mockRepos.templates.findActiveTemplate.mockResolvedValue(createMockTemplate());
      mockRepos.tags.findByUserId.mockResolvedValue([]);
      (mockLLMProvider.organize as ReturnType<typeof vi.fn>).mockResolvedValue(llmOutput);

      const result = await service.organizeCaptures(userId);

      expect(mockRepos.todos.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        capturesProcessed: 1,
        todosCount: 0,
      });
    });
  });
});
