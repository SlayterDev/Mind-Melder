import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TodosRepository } from '../repositories/todos-repository.js';
import type { Database } from '../client.js';

describe('TodosRepository - Feedback Methods', () => {
  let repository: TodosRepository;
  let mockDb: Database;

  beforeEach(() => {
    // Mock database client with chainable query methods
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn(),
    } as unknown as Database;

    repository = new TodosRepository(mockDb);
  });

  describe('submitFeedback', () => {
    it('should submit thumbs up feedback', async () => {
      const mockTodo = {
        id: 'todo-1',
        content: 'Test todo',
        feedbackVote: 'thumbs_up',
        feedbackText: null,
        feedbackTimestamp: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.update as any)().set().where().returning.mockResolvedValue([mockTodo]);

      const result = await repository.submitFeedback('todo-1', 'thumbs_up');

      expect(result).toEqual(mockTodo);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should submit thumbs down feedback with text', async () => {
      const mockTodo = {
        id: 'todo-1',
        content: 'Test todo',
        feedbackVote: 'thumbs_down',
        feedbackText: 'Not clear enough',
        feedbackTimestamp: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.update as any)().set().where().returning.mockResolvedValue([mockTodo]);

      const result = await repository.submitFeedback('todo-1', 'thumbs_down', 'Not clear enough');

      expect(result).toEqual(mockTodo);
      expect(result?.feedbackText).toBe('Not clear enough');
    });

    it('should reset feedback to none', async () => {
      const mockTodo = {
        id: 'todo-1',
        content: 'Test todo',
        feedbackVote: 'none',
        feedbackText: null,
        feedbackTimestamp: new Date(),
        updatedAt: new Date(),
      };

      (mockDb.update as any)().set().where().returning.mockResolvedValue([mockTodo]);

      const result = await repository.submitFeedback('todo-1', 'none');

      expect(result).toEqual(mockTodo);
      expect(result?.feedbackVote).toBe('none');
    });

    it('should return undefined when todo not found', async () => {
      (mockDb.update as any)().set().where().returning.mockResolvedValue([]);

      const result = await repository.submitFeedback('nonexistent', 'thumbs_up');

      expect(result).toBeUndefined();
    });
  });

  describe('findByFeedbackVote', () => {
    it('should find todos with thumbs up', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          feedbackVote: 'thumbs_up',
          feedbackTimestamp: new Date(),
        },
        {
          id: 'todo-2',
          userId: 'user-1',
          feedbackVote: 'thumbs_up',
          feedbackTimestamp: new Date(),
        },
      ];

      (mockDb.select as any)().from().where().orderBy.mockResolvedValue(mockTodos);

      const result = await repository.findByFeedbackVote('user-1', 'thumbs_up');

      expect(result).toEqual(mockTodos);
      expect(result).toHaveLength(2);
    });

    it('should find todos with thumbs down', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          feedbackVote: 'thumbs_down',
          feedbackText: 'Too vague',
          feedbackTimestamp: new Date(),
        },
      ];

      (mockDb.select as any)().from().where().orderBy.mockResolvedValue(mockTodos);

      const result = await repository.findByFeedbackVote('user-1', 'thumbs_down');

      expect(result).toEqual(mockTodos);
      expect(result).toHaveLength(1);
    });

    it('should find todos with no feedback', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          feedbackVote: 'none',
          feedbackText: null,
          feedbackTimestamp: null,
        },
      ];

      (mockDb.select as any)().from().where().orderBy.mockResolvedValue(mockTodos);

      const result = await repository.findByFeedbackVote('user-1', 'none');

      expect(result).toEqual(mockTodos);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no todos match', async () => {
      (mockDb.select as any)().from().where().orderBy.mockResolvedValue([]);

      const result = await repository.findByFeedbackVote('user-1', 'thumbs_up');

      expect(result).toEqual([]);
    });
  });

  describe('findWithFeedback', () => {
    it('should find todos with any feedback (thumbs up or down)', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          feedbackVote: 'thumbs_up',
          feedbackTimestamp: new Date('2026-02-03T12:00:00Z'),
        },
        {
          id: 'todo-2',
          userId: 'user-1',
          feedbackVote: 'thumbs_down',
          feedbackText: 'Needs work',
          feedbackTimestamp: new Date('2026-02-03T11:00:00Z'),
        },
      ];

      (mockDb.select as any)().from().where().orderBy.mockResolvedValue(mockTodos);

      const result = await repository.findWithFeedback('user-1');

      expect(result).toEqual(mockTodos);
      expect(result).toHaveLength(2);
    });

    it('should not include todos with vote none', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          feedbackVote: 'thumbs_up',
          feedbackTimestamp: new Date(),
        },
      ];

      (mockDb.select as any)().from().where().orderBy.mockResolvedValue(mockTodos);

      const result = await repository.findWithFeedback('user-1');

      expect(result).toEqual(mockTodos);
      expect(result.every(t => t.feedbackVote !== 'none')).toBe(true);
    });

    it('should return empty array when no todos have feedback', async () => {
      (mockDb.select as any)().from().where().orderBy.mockResolvedValue([]);

      const result = await repository.findWithFeedback('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findWithoutFeedback', () => {
    it('should find todos without feedback', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          userId: 'user-1',
          feedbackVote: 'none',
          feedbackText: null,
          feedbackTimestamp: null,
          createdAt: new Date('2026-02-03T12:00:00Z'),
        },
        {
          id: 'todo-2',
          userId: 'user-1',
          feedbackVote: 'none',
          feedbackText: null,
          feedbackTimestamp: null,
          createdAt: new Date('2026-02-03T11:00:00Z'),
        },
      ];

      (mockDb.select as any)().from().where().orderBy.mockResolvedValue(mockTodos);

      const result = await repository.findWithoutFeedback('user-1');

      expect(result).toEqual(mockTodos);
      expect(result).toHaveLength(2);
      expect(result.every(t => t.feedbackVote === 'none')).toBe(true);
    });

    it('should return empty array when all todos have feedback', async () => {
      (mockDb.select as any)().from().where().orderBy.mockResolvedValue([]);

      const result = await repository.findWithoutFeedback('user-1');

      expect(result).toEqual([]);
    });
  });
});
