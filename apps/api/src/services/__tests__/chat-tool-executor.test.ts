import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatToolExecutor } from '../chat-tool-executor.js';

// Mock repository method holders
const mockRepos = {
  captures: {
    findByUserId: vi.fn(),
    findUnorganized: vi.fn(),
    search: vi.fn(),
  },
  todos: {
    findDueToday: vi.fn(),
    search: vi.fn(),
  },
  notes: {
    search: vi.fn(),
  },
};

// Mock all database repositories
vi.mock('database', () => {
  class MockCapturesRepository {
    findByUserId = mockRepos.captures.findByUserId;
    findUnorganized = mockRepos.captures.findUnorganized;
    search = mockRepos.captures.search;
  }

  class MockTodosRepository {
    findDueToday = mockRepos.todos.findDueToday;
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

// Mock SearchService since it's used internally
vi.mock('../search-service.js', () => {
  return {
    SearchService: class {
      search = vi.fn().mockResolvedValue({
        captures: [],
        todos: [],
        notes: [],
      });
    },
  };
});

describe('ChatToolExecutor', () => {
  let executor: ChatToolExecutor;
  const userId = 'test-user-1';
  const mockDb = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new ChatToolExecutor(mockDb);
  });

  describe('executeTool', () => {
    it('should throw error for unknown tool', async () => {
      await expect(executor.executeTool(userId, 'unknown_tool', {})).rejects.toThrow(
        'Unknown tool: unknown_tool'
      );
    });
  });

  describe('search_user_content', () => {
    it('should return formatted search results', async () => {
      const mockSearchService = (executor as any).searchService;
      mockSearchService.search.mockResolvedValue({
        captures: [
          {
            id: 'cap-1',
            content: 'Test capture content',
            createdAt: new Date('2025-01-15T10:00:00Z'),
            type: 'capture',
          },
        ],
        todos: [
          {
            id: 'todo-1',
            content: 'Test todo',
            description: 'Test description',
            dueDate: new Date('2025-01-16T10:00:00Z'),
            status: 'pending',
            type: 'todo',
          },
        ],
        notes: [
          {
            id: 'note-1',
            title: 'Test note',
            content: 'Test note content that is quite long and should be truncated',
            type: 'note',
          },
        ],
      });

      const result = await executor.executeTool(userId, 'search_user_content', {
        query: 'test',
      });

      expect(result).toContain('Search Results:');
      expect(result).toContain('Captures:');
      expect(result).toContain('Test capture content');
      expect(result).toContain('Todos:');
      expect(result).toContain('Test todo');
      expect(result).toContain('Notes:');
      expect(result).toContain('Test note');
      expect(mockSearchService.search).toHaveBeenCalledWith(userId, 'test', 'all');
    });

    it('should return no results message when empty', async () => {
      const mockSearchService = (executor as any).searchService;
      mockSearchService.search.mockResolvedValue({
        captures: [],
        todos: [],
        notes: [],
      });

      const result = await executor.executeTool(userId, 'search_user_content', {
        query: 'nonexistent',
      });

      expect(result).toBe('No relevant content found.');
    });

    it('should respect type filter', async () => {
      const mockSearchService = (executor as any).searchService;
      mockSearchService.search.mockResolvedValue({
        todos: [
          {
            id: 'todo-1',
            content: 'Test todo',
            description: 'Description',
            dueDate: null,
            status: 'pending',
            type: 'todo',
          },
        ],
      });

      await executor.executeTool(userId, 'search_user_content', {
        query: 'test',
        type: 'todos',
      });

      expect(mockSearchService.search).toHaveBeenCalledWith(userId, 'test', 'todos');
    });

    it('should respect limit parameter', async () => {
      const mockSearchService = (executor as any).searchService;
      const manyCaptures = Array.from({ length: 20 }, (_, i) => ({
        id: `cap-${i}`,
        content: `Capture ${i}`,
        createdAt: new Date(),
        type: 'capture',
      }));
      mockSearchService.search.mockResolvedValue({
        captures: manyCaptures,
        todos: [],
        notes: [],
      });

      const result = await executor.executeTool(userId, 'search_user_content', {
        query: 'test',
        limit: 3,
      });

      // Should only show 3 captures
      const captureMatches = result.match(/Capture \d+/g);
      expect(captureMatches?.length).toBe(3);
    });
  });

  describe('get_todays_todos', () => {
    it('should return formatted todos due today', async () => {
      mockRepos.todos.findDueToday.mockResolvedValue([
        {
          id: 'todo-1',
          content: 'Important task',
          description: 'Do this today',
          dueDate: new Date('2025-01-15T17:00:00Z'),
          status: 'pending',
        },
        {
          id: 'todo-2',
          content: 'Another task',
          description: 'Also today',
          dueDate: new Date('2025-01-15T18:00:00Z'),
          status: 'completed',
        },
      ]);

      const result = await executor.executeTool(userId, 'get_todays_todos', {});

      expect(result).toContain("Today's Todos:");
      expect(result).toContain('Important task');
      expect(result).toContain('Pending');
      expect(result).toContain('Another task');
      expect(result).toContain('Completed');
      expect(mockRepos.todos.findDueToday).toHaveBeenCalledWith(userId, false);
    });

    it('should return no todos message when empty', async () => {
      mockRepos.todos.findDueToday.mockResolvedValue([]);

      const result = await executor.executeTool(userId, 'get_todays_todos', {});

      expect(result).toBe('No todos due today.');
    });

    it('should include completed todos when requested', async () => {
      mockRepos.todos.findDueToday.mockResolvedValue([]);

      await executor.executeTool(userId, 'get_todays_todos', {
        include_completed: true,
      });

      expect(mockRepos.todos.findDueToday).toHaveBeenCalledWith(userId, true);
    });
  });

  describe('get_recent_captures', () => {
    it('should return formatted recent captures', async () => {
      mockRepos.captures.findUnorganized.mockResolvedValue([
        {
          id: 'cap-1',
          content: 'First capture',
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
        {
          id: 'cap-2',
          content: 'Second capture',
          createdAt: new Date('2025-01-15T09:00:00Z'),
        },
      ]);

      const result = await executor.executeTool(userId, 'get_recent_captures', {});

      expect(result).toContain('Recent Captures:');
      expect(result).toContain('First capture');
      expect(result).toContain('Second capture');
      expect(mockRepos.captures.findUnorganized).toHaveBeenCalledWith(userId, undefined);
    });

    it('should return no captures message when empty', async () => {
      mockRepos.captures.findUnorganized.mockResolvedValue([]);

      const result = await executor.executeTool(userId, 'get_recent_captures', {});

      expect(result).toBe('No recent captures found.');
    });

    it('should respect limit parameter', async () => {
      const manyCaptures = Array.from({ length: 20 }, (_, i) => ({
        id: `cap-${i}`,
        content: `Capture ${i}`,
        createdAt: new Date(),
      }));
      mockRepos.captures.findUnorganized.mockResolvedValue(manyCaptures);

      const result = await executor.executeTool(userId, 'get_recent_captures', { limit: 5 });

      // Should only show 5 captures
      const captureMatches = result.match(/Capture \d+/g);
      expect(captureMatches?.length).toBe(5);
    });
  });
});
