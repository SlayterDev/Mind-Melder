import { Router, type Router as ExpressRouter } from 'express';
import { ConversationsRepository, Database, SettingsRepository } from 'database';
import { createConversationSchema, chatMessageInputSchema } from 'types';
import { ProviderFactory, type ChatMessage } from 'llm';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';

export function createConversationsRouter(
  db: Database,
  conversationsRepo: ConversationsRepository,
  settingsRepo: SettingsRepository
): ExpressRouter {
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

  // POST /api/v1/conversation/:id/chat - Send message (SSE streaming)
  router.post(
    '/:id/chat',
    validateBody(chatMessageInputSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { content } = req.body;
      const userId = 'test-user-1'; // TODO: Get from auth context

      const conversation = await conversationsRepo.findById(id);
      if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
      }

      // Save user message
      await conversationsRepo.addMessage({
        conversationId: id,
        role: 'user',
        content,
      });

      // Fetch conversation history and map to ChatMessage format
      const dbMessages = await conversationsRepo.getMessages(id);
      const messages: ChatMessage[] = [
        // Add system prompt if conversation has one
        ...(conversation.systemPrompt
          ? [{ role: 'system' as const, content: conversation.systemPrompt }]
          : []),
        // Map db messages to ChatMessage format
        ...dbMessages.map((m) => ({
          role: m.role as ChatMessage['role'],
          content: m.content,
          toolCallId: m.toolCallId,
          toolCalls: m.toolCalls,
        })),
      ];

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Get LLM provider from settings
      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);

      let assistantContent = '';

      await llmProvider.streamChat(messages, {
        onToken: (token) => {
          assistantContent += token;
          res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
        },
        onComplete: async (fullMessage) => {
          // Save assistant message
          const assistantMessage = await conversationsRepo.addMessage({
            conversationId: id,
            role: 'assistant',
            content: fullMessage,
          });
          res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id })}\n\n`);
          res.end();
        },
        onError: (error) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          res.end();
        },
      });
    })
  );

  return router;
}
