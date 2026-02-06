import { Router, type Router as ExpressRouter } from 'express';
import { ConversationsRepository } from 'database';
import { createConversationSchema, chatMessageInputSchema } from 'types';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

export function createConversationsRouter(conversationsRepo: ConversationsRepository): ExpressRouter {
  const router = Router();

  // POST /api/v1/conversation - Create new conversation
  router.post(
    '/',
    validateBody(createConversationSchema),
    asyncHandler(async (req, res) => {
      const { title, model, systemPrompt } = req.body;
      const userId = 'test-user-1'; // TODO: Get from auth context

      const conversation = await conversationsRepo.create({
        title,
        model,
        systemPrompt,
        userId,
      });

      res.status(201).json(conversation);
    })
  );

  // GET /api/v1/conversation - List all conversations
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const conversations = await conversationsRepo.findByUserId(userId);
      res.json(conversations);
    })
  );

  // GET /api/v1/conversation/:id - Get conversation with messages
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const conversation = await conversationsRepo.findById(id);
      if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
      }

      const messages = await conversationsRepo.getMessages(id);

      res.json({ ...conversation, messages });
    })
  );

  // DELETE /api/v1/conversation/:id - Delete conversation
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await conversationsRepo.delete(id);
      res.status(204).send();
    })
  );

  // POST /api/v1/conversation/:id/chat - Send message
  router.post(
    '/:id/chat',
    validateBody(chatMessageInputSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { content } = req.body;

      const conversation = await conversationsRepo.findById(id);
      if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
      }

      // Save user message
      const userMessage = await conversationsRepo.addMessage({
        conversationId: id,
        role: 'user',
        content,
      });

      // Fetch conversation history
      const messages = await conversationsRepo.getMessages(id);

      // TODO: Call LLM, handle tool calls, save assistant response

      res.status(201).json({ message: userMessage, history: messages });
    })
  );

  return router;
}
