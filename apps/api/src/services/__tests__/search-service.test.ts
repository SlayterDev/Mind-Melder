import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../search-service.js';
import type { Capture, Todo, OrganizedNote } from 'database';

// Mock repository method holders
const mockRepos = {
  captures: {
    search: vi.fn(),
  },
  todos: {
    search: vi.fn(),
  },
  notes: {
    search: vi.fn(),
  },
};

vi.mock('database', () => {
  class MockCapturesRepository {
    search = mockRepos.captures.search;
  }

  class MockTodosRepository {
    search = mockRepos.todos.search;
  }

  class MockOrganizedNotesRepository {
    search = mockRepos.notes.search;
  }

  return {
    CapturesRepository: MockCapturesRepository,
    TodosRepository: MockTodosRepository,
    OrganizedNotesRepository: MockOrganizedNotesRepository,
  };
});

// Test fixtures
const userId = 'user-1';
const query = 'meeting';

const mockCapture: Capture = {
  id: 'capture-1',
  content: 'Meeting notes about the project',
  timestamp: new Date('2025-01-15T10:00:00Z'),
  metadata: null,
  userId,
  organized: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
};

const mockTodo: Todo = {
  id: 'todo-1',
  content: 'Schedule meeting',
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
};

const mockNote: OrganizedNote = {
  id: 'note-1',
  title: 'Meeting Agenda',
  content: 'Agenda items for the meeting',
  userId,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date('2025-01-15T10:00:00Z'),
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService({} as never);

    // Default: empty results
    mockRepos.captures.search.mockResolvedValue([]);
    mockRepos.todos.search.mockResolvedValue([]);
    mockRepos.notes.search.mockResolvedValue([]);
  });

  describe('search with type="all"', () => {
    it('should query all three repositories', async () => {
      await service.search(userId, query, 'all');

      expect(mockRepos.captures.search).toHaveBeenCalledWith(userId, query);
      expect(mockRepos.todos.search).toHaveBeenCalledWith(userId, query);
      expect(mockRepos.notes.search).toHaveBeenCalledWith(userId, query);
    });

    it('should return results from all three sources', async () => {
      mockRepos.captures.search.mockResolvedValue([mockCapture]);
      mockRepos.todos.search.mockResolvedValue([mockTodo]);
      mockRepos.notes.search.mockResolvedValue([mockNote]);

      const result = await service.search(userId, query, 'all');

      expect(result.captures).toHaveLength(1);
      expect(result.todos).toHaveLength(1);
      expect(result.notes).toHaveLength(1);
    });
  });

  describe('search with type="captures"', () => {
    it('should only query the captures repository', async () => {
      await service.search(userId, query, 'captures');

      expect(mockRepos.captures.search).toHaveBeenCalledWith(userId, query);
      expect(mockRepos.todos.search).not.toHaveBeenCalled();
      expect(mockRepos.notes.search).not.toHaveBeenCalled();
    });

    it('should only return captures results', async () => {
      mockRepos.captures.search.mockResolvedValue([mockCapture]);

      const result = await service.search(userId, query, 'captures');

      expect(result.captures).toHaveLength(1);
      expect(result.todos).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe('search with type="todos"', () => {
    it('should only query the todos repository', async () => {
      await service.search(userId, query, 'todos');

      expect(mockRepos.todos.search).toHaveBeenCalledWith(userId, query);
      expect(mockRepos.captures.search).not.toHaveBeenCalled();
      expect(mockRepos.notes.search).not.toHaveBeenCalled();
    });

    it('should only return todos results', async () => {
      mockRepos.todos.search.mockResolvedValue([mockTodo]);

      const result = await service.search(userId, query, 'todos');

      expect(result.todos).toHaveLength(1);
      expect(result.captures).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });

  describe('search with type="notes"', () => {
    it('should only query the notes repository', async () => {
      await service.search(userId, query, 'notes');

      expect(mockRepos.notes.search).toHaveBeenCalledWith(userId, query);
      expect(mockRepos.captures.search).not.toHaveBeenCalled();
      expect(mockRepos.todos.search).not.toHaveBeenCalled();
    });

    it('should only return notes results', async () => {
      mockRepos.notes.search.mockResolvedValue([mockNote]);

      const result = await service.search(userId, query, 'notes');

      expect(result.notes).toHaveLength(1);
      expect(result.captures).toBeUndefined();
      expect(result.todos).toBeUndefined();
    });
  });

  describe('type discriminator fields', () => {
    it('should add type="capture" to each capture result', async () => {
      mockRepos.captures.search.mockResolvedValue([mockCapture]);

      const result = await service.search(userId, query, 'captures');

      expect(result.captures![0].type).toBe('capture');
    });

    it('should add type="todo" to each todo result', async () => {
      mockRepos.todos.search.mockResolvedValue([mockTodo]);

      const result = await service.search(userId, query, 'todos');

      expect(result.todos![0].type).toBe('todo');
    });

    it('should add type="note" to each note result', async () => {
      mockRepos.notes.search.mockResolvedValue([mockNote]);

      const result = await service.search(userId, query, 'notes');

      expect(result.notes![0].type).toBe('note');
    });

    it('should preserve all original fields alongside the type discriminator', async () => {
      mockRepos.captures.search.mockResolvedValue([mockCapture]);

      const result = await service.search(userId, query, 'captures');

      expect(result.captures![0]).toMatchObject({
        id: 'capture-1',
        content: 'Meeting notes about the project',
        type: 'capture',
      });
    });
  });

  describe('default type', () => {
    it('should default to type="all" when no type is provided', async () => {
      await service.search(userId, query);

      expect(mockRepos.captures.search).toHaveBeenCalled();
      expect(mockRepos.todos.search).toHaveBeenCalled();
      expect(mockRepos.notes.search).toHaveBeenCalled();
    });
  });
});
