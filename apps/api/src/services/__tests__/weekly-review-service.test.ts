import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeeklyReviewService } from '../weekly-review-service.js';
import type { LLMProvider, WeeklyReviewOutput } from 'llm';
import type { Capture, OrganizedNote, Todo } from 'database';

// Mock repository method holders
const mockRepos = {
  captures: {
    findByUserId: vi.fn(),
  },
  todos: {
    findByUserId: vi.fn(),
  },
  notes: {
    findByUserId: vi.fn(),
  },
  todaySheets: {
    findByUserId: vi.fn(),
  },
  weeklyReviews: {
    findByWeek: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    findLatestByUserId: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
  },
};

vi.mock('database', () => {
  class MockCapturesRepository {
    findByUserId = mockRepos.captures.findByUserId;
  }

  class MockTodosRepository {
    findByUserId = mockRepos.todos.findByUserId;
  }

  class MockOrganizedNotesRepository {
    findByUserId = mockRepos.notes.findByUserId;
  }

  class MockTodaySheetsRepository {
    findByUserId = mockRepos.todaySheets.findByUserId;
  }

  class MockWeeklyReviewsRepository {
    findByWeek = mockRepos.weeklyReviews.findByWeek;
    delete = mockRepos.weeklyReviews.delete;
    create = mockRepos.weeklyReviews.create;
    findLatestByUserId = mockRepos.weeklyReviews.findLatestByUserId;
    findById = mockRepos.weeklyReviews.findById;
    findByUserId = mockRepos.weeklyReviews.findByUserId;
  }

  return {
    CapturesRepository: MockCapturesRepository,
    TodosRepository: MockTodosRepository,
    OrganizedNotesRepository: MockOrganizedNotesRepository,
    TodaySheetsRepository: MockTodaySheetsRepository,
    WeeklyReviewsRepository: MockWeeklyReviewsRepository,
  };
});

// Test fixtures
const userId = 'user-1';

const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-1',
  content: 'Test todo',
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
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

const createMockCapture = (overrides: Partial<Capture> = {}): Capture => ({
  id: 'capture-1',
  content: 'Test capture',
  timestamp: new Date('2025-01-15T10:00:00Z'),
  metadata: null,
  userId,
  organized: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

const createMockNote = (overrides: Partial<OrganizedNote> = {}): OrganizedNote => ({
  id: 'note-1',
  title: 'Test note',
  content: 'Note content',
  userId,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
  ...overrides,
});

const createMockReview = (overrides: Record<string, unknown> = {}) => ({
  id: 'review-1',
  userId,
  weekStartDate: '2025-01-13',
  weekEndDate: '2025-01-19',
  summary: 'A productive week.',
  insights: {
    accomplishments: ['Shipped feature X'],
    patterns: { completionRate: 80, topCategories: ['work'], observations: [] },
    carryForward: [],
    recommendations: ['Prioritize documentation'],
  },
  createdAt: new Date('2025-01-19T18:00:00Z'),
  updatedAt: new Date('2025-01-19T18:00:00Z'),
  ...overrides,
});

const createMockAiResult = (): WeeklyReviewOutput => ({
  summary: 'Productive week with good progress.',
  insights: {
    accomplishments: ['Completed feature Y'],
    patterns: {
      completionRate: 75,
      topCategories: ['engineering'],
      observations: ['You work best in the morning.'],
    },
    carryForward: [],
    recommendations: ['Block time for deep work.'],
  },
});

describe('WeeklyReviewService', () => {
  let service: WeeklyReviewService;
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

    service = new WeeklyReviewService({} as never, mockLLMProvider);

    // Default: no existing review
    mockRepos.weeklyReviews.findByWeek.mockResolvedValue(undefined);
    mockRepos.weeklyReviews.delete.mockResolvedValue(undefined);
    mockRepos.weeklyReviews.create.mockResolvedValue(createMockReview());
    mockRepos.weeklyReviews.findLatestByUserId.mockResolvedValue(createMockReview());
    mockRepos.weeklyReviews.findById.mockResolvedValue(createMockReview());

    // Default: one todo/capture/note in the week to satisfy hasData
    mockRepos.todos.findByUserId.mockResolvedValue([
      createMockTodo({
        status: 'completed',
        completedAt: new Date('2025-01-15T12:00:00Z'), // Wednesday in Jan 13-19 week
        createdAt: new Date('2025-01-10T10:00:00Z'),   // Prior week
      }),
    ]);
    mockRepos.captures.findByUserId.mockResolvedValue([]);
    mockRepos.notes.findByUserId.mockResolvedValue([]);
    mockRepos.todaySheets.findByUserId.mockResolvedValue([]);

    (mockLLMProvider.generateWeeklyReview as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockAiResult()
    );
  });

  describe('getWeekBounds (via generateReview)', () => {
    // The private getWeekBounds method is tested indirectly by verifying
    // what date `findByWeek` is called with for various input dates.

    it('should identify Monday as the start of the week when given a Monday', async () => {
      await service.generateReview(userId, '2025-01-13'); // 2025-01-13 is a Monday

      expect(mockRepos.weeklyReviews.findByWeek).toHaveBeenCalledWith(userId, '2025-01-13');
    });

    it('should roll back to Monday when given a Wednesday', async () => {
      await service.generateReview(userId, '2025-01-15'); // Wednesday → week starts 2025-01-13

      expect(mockRepos.weeklyReviews.findByWeek).toHaveBeenCalledWith(userId, '2025-01-13');
    });

    it('should roll back 6 days when given a Sunday (edge case)', async () => {
      await service.generateReview(userId, '2025-01-19'); // Sunday → week starts 2025-01-13

      expect(mockRepos.weeklyReviews.findByWeek).toHaveBeenCalledWith(userId, '2025-01-13');
    });

    it('should roll back to Monday when given a Saturday', async () => {
      await service.generateReview(userId, '2025-01-18'); // Saturday → week starts 2025-01-13

      expect(mockRepos.weeklyReviews.findByWeek).toHaveBeenCalledWith(userId, '2025-01-13');
    });
  });

  describe('generateReview', () => {
    it('should return existing review without regenerating when one exists', async () => {
      const existing = createMockReview({ id: 'existing-review' });
      mockRepos.weeklyReviews.findByWeek.mockResolvedValue(existing);

      const result = await service.generateReview(userId, '2025-01-15');

      expect(result.id).toBe('existing-review');
      expect(mockLLMProvider.generateWeeklyReview).not.toHaveBeenCalled();
      expect(mockRepos.weeklyReviews.create).not.toHaveBeenCalled();
    });

    it('should delete old review and regenerate when forceRegenerate is true', async () => {
      const existing = createMockReview({ id: 'old-review' });
      mockRepos.weeklyReviews.findByWeek.mockResolvedValue(existing);

      await service.generateReview(userId, '2025-01-15', true);

      expect(mockRepos.weeklyReviews.delete).toHaveBeenCalledWith('old-review');
      expect(mockLLMProvider.generateWeeklyReview).toHaveBeenCalled();
      expect(mockRepos.weeklyReviews.create).toHaveBeenCalled();
    });

    it('should only include todos completed within the week (filter by completedAt)', async () => {
      const completedInsideWeek = createMockTodo({
        id: 'todo-in',
        status: 'completed',
        completedAt: new Date('2025-01-15T10:00:00Z'), // Wednesday – inside week
      });
      const completedOutsideWeek = createMockTodo({
        id: 'todo-out',
        status: 'completed',
        completedAt: new Date('2025-01-06T10:00:00Z'), // Prior week – outside
      });
      mockRepos.todos.findByUserId.mockResolvedValue([completedInsideWeek, completedOutsideWeek]);

      await service.generateReview(userId, '2025-01-15');

      expect(mockLLMProvider.generateWeeklyReview).toHaveBeenCalledWith(
        expect.objectContaining({
          completedTodos: [completedInsideWeek],
        })
      );
    });

    it('should only include pending todos created within the week (filter by createdAt)', async () => {
      const pendingInsideWeek = createMockTodo({
        id: 'pending-in',
        status: 'pending',
        createdAt: new Date('2025-01-14T10:00:00Z'), // Tuesday – inside week
      });
      const pendingOutsideWeek = createMockTodo({
        id: 'pending-out',
        status: 'pending',
        createdAt: new Date('2025-01-06T10:00:00Z'), // Prior week – outside
      });
      // Add a completed todo to satisfy hasData check
      const completedTodo = createMockTodo({
        id: 'todo-c',
        status: 'completed',
        completedAt: new Date('2025-01-15T10:00:00Z'),
      });
      mockRepos.todos.findByUserId.mockResolvedValue([pendingInsideWeek, pendingOutsideWeek, completedTodo]);

      await service.generateReview(userId, '2025-01-15');

      expect(mockLLMProvider.generateWeeklyReview).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingTodos: [pendingInsideWeek],
        })
      );
    });

    it('should only include captures with timestamp within the week', async () => {
      const captureInside = createMockCapture({
        id: 'cap-in',
        timestamp: new Date('2025-01-14T10:00:00Z'), // inside week
      });
      const captureOutside = createMockCapture({
        id: 'cap-out',
        timestamp: new Date('2025-01-07T10:00:00Z'), // prior week
      });
      mockRepos.captures.findByUserId.mockResolvedValue([captureInside, captureOutside]);

      await service.generateReview(userId, '2025-01-15');

      expect(mockLLMProvider.generateWeeklyReview).toHaveBeenCalledWith(
        expect.objectContaining({
          captures: [captureInside],
        })
      );
    });

    it('should include notes created or updated within the week', async () => {
      const noteCreatedInsideWeek = createMockNote({
        id: 'note-1',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      });
      const noteUpdatedInsideWeek = createMockNote({
        id: 'note-2',
        createdAt: new Date('2025-01-01T10:00:00Z'), // created before week
        updatedAt: new Date('2025-01-16T10:00:00Z'), // but updated inside week
      });
      const noteOutsideWeek = createMockNote({
        id: 'note-3',
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-01T10:00:00Z'),
      });
      mockRepos.notes.findByUserId.mockResolvedValue([
        noteCreatedInsideWeek,
        noteUpdatedInsideWeek,
        noteOutsideWeek,
      ]);

      await service.generateReview(userId, '2025-01-15');

      expect(mockLLMProvider.generateWeeklyReview).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.arrayContaining([noteCreatedInsideWeek, noteUpdatedInsideWeek]),
        })
      );
      const call = (mockLLMProvider.generateWeeklyReview as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.notes).not.toContainEqual(noteOutsideWeek);
    });

    it('should throw when there is no activity for the week', async () => {
      mockRepos.todos.findByUserId.mockResolvedValue([]);
      mockRepos.captures.findByUserId.mockResolvedValue([]);
      mockRepos.notes.findByUserId.mockResolvedValue([]);
      mockRepos.todaySheets.findByUserId.mockResolvedValue([]);

      await expect(service.generateReview(userId, '2025-01-15')).rejects.toThrow(
        'No activity found for this week'
      );
    });

    it('should wrap LLM validation errors with a user-friendly message', async () => {
      (mockLLMProvider.generateWeeklyReview as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('LLM response validation failed: missing field')
      );

      await expect(service.generateReview(userId, '2025-01-15')).rejects.toThrow(
        'AI returned invalid response format. Please try again.'
      );
    });

    it('should re-throw non-validation LLM errors as-is', async () => {
      (mockLLMProvider.generateWeeklyReview as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await expect(service.generateReview(userId, '2025-01-15')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should persist and return the generated review', async () => {
      const savedReview = createMockReview({ id: 'new-review', summary: 'Productive week.' });
      mockRepos.weeklyReviews.create.mockResolvedValue(savedReview);

      const result = await service.generateReview(userId, '2025-01-15');

      expect(mockRepos.weeklyReviews.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          weekStartDate: '2025-01-13',
          summary: 'Productive week with good progress.', // from AI result
        })
      );
      expect(result.id).toBe('new-review');
    });
  });

  describe('getLatestReview', () => {
    it('should return the most recent review for the user', async () => {
      const latestReview = createMockReview({ id: 'latest' });
      mockRepos.weeklyReviews.findLatestByUserId.mockResolvedValue(latestReview);

      const result = await service.getLatestReview(userId);

      expect(result).toEqual(latestReview);
      expect(mockRepos.weeklyReviews.findLatestByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('getReview', () => {
    it('should return the review when it belongs to the correct user', async () => {
      const review = createMockReview({ id: 'review-1', userId });
      mockRepos.weeklyReviews.findById.mockResolvedValue(review);

      const result = await service.getReview('review-1', userId);

      expect(result).toEqual(review);
    });

    it('should throw Unauthorized when review belongs to a different user', async () => {
      const review = createMockReview({ id: 'review-1', userId: 'other-user' });
      mockRepos.weeklyReviews.findById.mockResolvedValue(review);

      await expect(service.getReview('review-1', userId)).rejects.toThrow('Unauthorized');
    });

    it('should return undefined when review does not exist', async () => {
      mockRepos.weeklyReviews.findById.mockResolvedValue(undefined);

      const result = await service.getReview('nonexistent', userId);

      expect(result).toBeUndefined();
    });
  });
});
