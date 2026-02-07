import { Ollama } from 'ollama';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type { ChatMessage, LLMProvider, OrganizedOutput, ProviderConfig, StreamCallbacks, ToolCall, ToolDefinition, TodaySheetInput, TodaySheetOutput } from '../types.js';
import { organizedOutputSchema, todaySheetOutputSchema } from '../validation.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OllamaProvider extends BaseLLMProvider implements LLMProvider {
  private client: Ollama;
  private model: string;
  private temperature: number;
  
  // Cache converted JSON schemas to avoid repeated conversions
  private organizedOutputJsonSchema: ReturnType<typeof zodToJsonSchema>;
  private todaySheetOutputJsonSchema: ReturnType<typeof zodToJsonSchema>;
  private taskExtractionJsonSchema: object;

  constructor(config: ProviderConfig) {
    super();

    const baseURL = config.baseURL || 'http://localhost:11434';
    this.client = new Ollama({ host: baseURL });
    this.model = config.model || 'mistral';
    this.temperature = config.temperature ?? 0.7;
    
    // Pre-convert schemas once during construction
    this.organizedOutputJsonSchema = zodToJsonSchema(organizedOutputSchema, 'organizedOutput');
    this.todaySheetOutputJsonSchema = zodToJsonSchema(todaySheetOutputSchema, 'todaySheetOutput');
    
    // Define task extraction schema
    this.taskExtractionJsonSchema = {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              dueDate: { type: 'string' },
            },
            required: ['content'],
          },
        },
      },
      required: ['todos'],
    };
  }

  async organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags, includeDescriptions ?? false);

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: this.organizedOutputJsonSchema,
      options: {
        temperature: this.temperature,
      },
    });

    return this.parseResponse<OrganizedOutput>(response.message.content, organizedOutputSchema);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      stream: false,
      format: this.taskExtractionJsonSchema,
      options: {
        temperature: Math.min(this.temperature, 0.5),
      },
    });

    const result = this.parseResponse<{ todos: { content: string; dueDate?: string }[] }>(
      response.message.content
    );
    return result.todos;
  }

  async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildTodaySheetPrompt(input);

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: this.todaySheetOutputJsonSchema,
      options: {
        temperature: Math.min(this.temperature, 0.5),
      },
    });

    return this.parseResponse<TodaySheetOutput>(response.message.content, todaySheetOutputSchema);
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks, tools?: ToolDefinition[]): Promise<void> {
    // Map messages to Ollama format
    // Tool results are converted to user messages since not all models support tool role
    const ollamaMessages = messages.map(m => {
      if (m.role === 'tool') {
        // Convert tool result to a user message the model can understand
        return {
          role: 'user' as const,
          content: `[Tool Result]\n${m.content ?? ''}`,
        };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        // Include tool call info in assistant message
        const toolInfo = m.toolCalls.map(tc =>
          `[Called tool: ${tc.name} with args: ${JSON.stringify(tc.arguments)}]`
        ).join('\n');
        return {
          role: 'assistant' as const,
          content: `${m.content ?? ''}\n${toolInfo}`.trim(),
        };
      }
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content ?? '',
      };
    });

    // Convert tools to Ollama format
    const ollamaTools = tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object' as const,
          properties: t.input_schema.properties as Record<string, {
            type?: string | string[];
            description?: string;
            enum?: unknown[];
          }>,
          required: t.input_schema.required,
        },
      },
    }));

    // If tools provided, use non-streaming to handle tool calls properly
    if (ollamaTools?.length) {
      try {
        const response = await this.client.chat({
          model: this.model,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: this.temperature,
          },
          tools: ollamaTools,
        });

        // Send text content as tokens
        if (response.message.content) {
          callbacks.onToken(response.message.content);
        }

        // Handle tool calls
        if (response.message.tool_calls) {
          for (const tc of response.message.tool_calls) {
            const toolCall: ToolCall = {
              id: `ollama-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              name: tc.function.name,
              arguments: tc.function.arguments,
            };
            callbacks.onToolCall?.(toolCall);
          }
        }

        callbacks.onComplete(response.message.content ?? '');
      } catch {
        // Model might not support tools, fall back to streaming without tools
        const response = await this.client.chat({
          model: this.model,
          messages: ollamaMessages,
          stream: true,
          options: {
            temperature: this.temperature,
          },
        });

        let fullMessage = '';
        for await (const chunk of response) {
          if (chunk.message.content) {
            callbacks.onToken(chunk.message.content);
            fullMessage += chunk.message.content;
          }
        }
        callbacks.onComplete(fullMessage);
      }
      return;
    }

    // No tools - use streaming
    const response = await this.client.chat({
      model: this.model,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature: this.temperature,
      },
    });

    let fullMessage = '';
    for await (const chunk of response) {
      if (chunk.message.content) {
        callbacks.onToken(chunk.message.content);
        fullMessage += chunk.message.content;
      }
    }

    callbacks.onComplete(fullMessage);
  }
}
