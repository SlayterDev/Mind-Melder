import { Router, type Router as ExpressRouter } from 'express';
import { TodosRepository } from 'database';
import { createTodoSchema, updateTodoSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

export function createTodosRouter(todosRepo: TodosRepository): ExpressRouter {
  const router = Router();

  // POST /api/v1/todos - Create todo
  router.post(
    '/',
    validateBody(createTodoSchema),
    asyncHandler(async (req, res) => {
      const { content, dueDate } = req.body;
      const userId = 'test-user-1'; // TODO: Get from auth context

      const todo = await todosRepo.create({
        content,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        userId,
      });

      res.status(201).json(todo);
    })
  );

  // GET /api/v1/todos - List todos (optional: filter by status)
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context
      const { status } = req.query;

      let todos;
      if (status && (status === 'pending' || status === 'completed')) {
        todos = await todosRepo.findByStatus(userId, status);
      } else {
        todos = await todosRepo.findByUserId(userId);
      }

      res.json(todos);
    })
  );

  // GET /api/v1/todos/:id - Get single todo
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const todo = await todosRepo.findById(id);
      if (!todo) {
        throw new ApiError(404, 'Todo not found');
      }

      res.json(todo);
    })
  );

  // PATCH /api/v1/todos/:id - Update todo
  router.patch(
    '/:id',
    validateBody(updateTodoSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { content, description, status, dueDate } = req.body;

      const todo = await todosRepo.update(id, {
        content,
        description,
        status,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      });

      if (!todo) {
        throw new ApiError(404, 'Todo not found');
      }

      res.json(todo);
    })
  );

  // PATCH /api/v1/todos/:id/complete - Mark as completed
  router.patch(
    '/:id/complete',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const todo = await todosRepo.markAsCompleted(id);
      if (!todo) {
        throw new ApiError(404, 'Todo not found');
      }

      res.json(todo);
    })
  );

  // DELETE /api/v1/todos/:id - Delete todo
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await todosRepo.delete(id);
      res.status(204).send();
    })
  );

  return router;
}
