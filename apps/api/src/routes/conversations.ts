import { Router, type Router as ExpressRouter, type Response } from 'express';
import { ConversationsRepository, Database, SettingsRepository } from 'database';
import { createConversationSchema, chatMessageInputSchema } from 'types';
import { ProviderFactory, chatTools, type ChatMessage, type ToolCall, type LLMProvider } from 'llm';
import { asyncHandler } from '../utils/async-handler.js';
import { validateBody, ApiError } from '../middleware/index.js';
import { ChatToolExecutor } from '../services/chat-tool-executor.js';

export function createConversationsRouter(
  db: Database,
  conversationsRepo: ConversationsRepository,
  settingsRepo: SettingsRepository
): ExpressRouter {
  const router = Router();

  // POST /api/v1/conversations - Create new conversation
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

  // GET /api/v1/conversations - List all conversations
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Get from auth context

      const conversations = await conversationsRepo.findByUserId(userId);
      res.json(conversations);
    })
  );

  // GET /api/v1/conversations/:id - Get conversation with messages
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const userId = 'test-user-1'; // TODO: Get from auth context

      const conversation = await conversationsRepo.findById(id);
      if (!conversation || conversation.userId !== userId) {
        throw new ApiError(404, 'Conversation not found');
      }

      const messages = await conversationsRepo.getMessages(id);

      res.json({ ...conversation, messages });
    })
  );

  // DELETE /api/v1/conversations/:id - Delete conversation
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const userId = 'test-user-1'; // TODO: Get from auth context

      // Verify ownership before deleting
      const conversation = await conversationsRepo.findById(id);
      if (!conversation || conversation.userId !== userId) {
        throw new ApiError(404, 'Conversation not found');
      }

      await conversationsRepo.delete(id);
      res.status(204).send();
    })
  );

  // Helper to run a single LLM turn with tool handling
  async function runLLMTurn(
    llmProvider: LLMProvider,
    messages: ChatMessage[],
    res: Response
  ): Promise<{ toolCalls: ToolCall[]; content: string }> {
    let content = '';
    const toolCalls: ToolCall[] = [];

    try {
      await llmProvider.streamChat(
        messages,
        {
          onToken: (token) => {
            content += token;
            res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
          },
          onToolCall: (toolCall) => {
            toolCalls.push(toolCall);
            res.write(`data: ${JSON.stringify({ type: 'tool_call', toolCall })}\n\n`);
          },
          onComplete: () => {
            // Handled after this function returns
          },
          onError: (error) => {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          },
        },
        chatTools
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred while streaming.';
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      res.end();
      throw error;
    }

    return { toolCalls, content };
  }

  // POST /api/v1/conversations/:id/chat - Send message (SSE streaming)
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

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Track if client disconnected
      let clientDisconnected = false;
      const handleDisconnect = () => {
        clientDisconnected = true;
      };
      
      req.on('close', handleDisconnect);
      res.on('close', handleDisconnect);

      // Get LLM provider from settings
      const settings = await settingsRepo.getOrCreate(userId);
      const llmProvider = ProviderFactory.createFromSettings(settings);
      const toolExecutor = new ChatToolExecutor(db);

      // Build initial messages from conversation history
      const buildMessages = async (): Promise<ChatMessage[]> => {
        const dbMessages = await conversationsRepo.getMessages(id);
        return [
          ...(conversation.systemPrompt
            ? [{ role: 'system' as const, content: conversation.systemPrompt }]
            : []),
          ...dbMessages.map((m) => ({
            role: m.role as ChatMessage['role'],
            content: m.content,
            toolCallId: m.toolCallId,
            toolCalls: m.toolCalls,
          })),
        ];
      };

      // Run LLM turns until no more tool calls
      const MAX_TOOL_ITERATIONS = 5;
      let iterations = 0;

      while (iterations < MAX_TOOL_ITERATIONS) {
        // Check if client disconnected
        if (clientDisconnected) {
          return;
        }

        iterations++;
        const messages = await buildMessages();
        const { toolCalls, content: turnContent } = await runLLMTurn(
          llmProvider,
          messages,
          res
        );

        if (toolCalls.length === 0) {
          // No tool calls - save final message and end
          const assistantMessage = await conversationsRepo.addMessage({
            conversationId: id,
            role: 'assistant',
            content: turnContent,
          });
          res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id })}\n\n`);
          res.end();
          return;
        }

        // Save assistant message with tool calls
        await conversationsRepo.addMessage({
          conversationId: id,
          role: 'assistant',
          content: turnContent || null,
          toolCalls,
        });

        // Execute each tool and save results
        for (const toolCall of toolCalls) {
          // Check if client disconnected
          if (clientDisconnected) {
            return;
          }

          try {
            const result = await toolExecutor.executeTool(userId, toolCall.name, toolCall.arguments);
            res.write(`data: ${JSON.stringify({ type: 'tool_result', name: toolCall.name, result })}\n\n`);

            // Save tool result message
            await conversationsRepo.addMessage({
              conversationId: id,
              role: 'tool',
              content: result,
              toolCallId: toolCall.id,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
            res.write(`data: ${JSON.stringify({ type: 'tool_error', name: toolCall.name, error: errorMessage })}\n\n`);

            // Save error as tool result
            await conversationsRepo.addMessage({
              conversationId: id,
              role: 'tool',
              content: `Error: ${errorMessage}`,
              toolCallId: toolCall.id,
            });
          }
        }

        // Continue loop to call LLM again with tool results
      }

      // Max iterations reached
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Max tool iterations reached' })}\n\n`);
      res.end();
    })
  );

  return router;
}
