import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodType } from 'zod';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type {
  ChatMessage,
  LLMProvider,
  OrganizedOutput,
  ProviderConfig,
  StreamCallbacks,
  ToolCall,
  ToolDefinition,
  TodaySheetInput,
  TodaySheetOutput,
  TranscribeOptions,
  TranscriptionResult,
  WeeklyReviewInput,
  WeeklyReviewOutput,
  TemplateSuggestionsOutput,
} from '../types.js';
import {
  organizedOutputSchema,
  todaySheetOutputSchema,
  weeklyReviewOutputSchema,
  templateSuggestionsOutputSchema,
  extractTasksOutputSchema,
  refineNoteOutputSchema,
} from '../validation.js';

const DEFAULT_HOST = 'http://localhost:1234';
// LM Studio requires a non-empty API key field but does not validate it
const PLACEHOLDER_API_KEY = 'lm-studio';

export class LMStudioProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(config: ProviderConfig) {
    super();

    // Accept host:port (e.g. http://localhost:1234) and always append /v1
    const host = (config.baseURL || DEFAULT_HOST).replace(/\/+$/, '');
    const baseURL = host.endsWith('/v1') ? host : `${host}/v1`;
    this.client = new OpenAI({ apiKey: PLACEHOLDER_API_KEY, baseURL });

    // Empty string means "use whatever model is currently loaded in LM Studio"
    this.model = config.model || '';

    let temp = config.temperature ?? 0.7;
    temp = Math.max(0.3, Math.min(1, temp));
    this.temperature = temp;
  }

  private storeUsage(response: { usage?: { prompt_tokens?: number; completion_tokens?: number } | null }) {
    if (response.usage) {
      this.lastUsage = {
        inputTokens: response.usage.prompt_tokens ?? null,
        outputTokens: response.usage.completion_tokens ?? null,
      };
    } else {
      this.lastUsage = null;
    }
  }

  /**
   * Build a json_schema response_format from a Zod schema.
   * LM Studio uses grammar-based sampling to guarantee the output matches the schema,
   * which prevents reasoning tokens (<think> tags) from leaking into the response.
   */
  private structuredFormat(schema: ZodType, name: string): OpenAI.ResponseFormatJSONSchema {
    const jsonSchema = zodToJsonSchema(schema, { $refStrategy: 'none', target: 'openApi3' });
    // Strip the top-level $schema field — LM Studio doesn't need it
    const { $schema: _unused, ...cleanSchema } = jsonSchema as Record<string, unknown>;
    return {
      type: 'json_schema',
      json_schema: { name, strict: true, schema: cleanSchema },
    };
  }

  async organize(
    captures: Capture[],
    template: Template,
    tags?: Tag[],
    includeDescriptions?: boolean,
    contentLockEnabled?: boolean,
  ): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(
      captures,
      template,
      tags,
      includeDescriptions ?? false,
      contentLockEnabled ?? false,
    );

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.structuredFormat(organizedOutputSchema, 'organized_output'),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LM Studio');

    return this.parseResponse<OrganizedOutput>(content, organizedOutputSchema);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: this.temperature,
      response_format: this.structuredFormat(extractTasksOutputSchema, 'extract_tasks_output'),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LM Studio');

    const result = this.parseResponse<{ todos: { content: string; dueDate?: string }[] }>(
      content,
      extractTasksOutputSchema,
    );
    return result.todos;
  }

  async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildTodaySheetPrompt(input);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.structuredFormat(todaySheetOutputSchema, 'today_sheet_output'),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LM Studio');

    return this.parseResponse<TodaySheetOutput>(content, todaySheetOutputSchema);
  }

  async generateTitle(messages: ChatMessage[]): Promise<string> {
    const conversationText = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => `${m.role}: ${m.content ?? ''}`)
      .join('\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 30,
      temperature: 0.3,
      messages: [
        { role: 'system', content: this.buildChatTitleSystemPrompt() },
        { role: 'user', content: conversationText },
      ],
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LM Studio');

    return content.trim();
  }

  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    tools?: ToolDefinition[],
  ): Promise<void> {
    // Map our ChatMessage to OpenAI format
    const openaiMessages = messages.map((m) => {
      if (m.role === 'tool') {
        if (!m.toolCallId) throw new Error('toolCallId is required for tool messages');
        return { role: 'tool' as const, content: m.content ?? '', tool_call_id: m.toolCallId };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: m.content ?? null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        };
      }
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content ?? '',
      };
    });

    const openaiTools = tools?.map((t) => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));

    // Try with tools first; fall back to plain streaming if the model doesn't support them
    if (openaiTools?.length) {
      try {
        await this._streamWithTools(openaiMessages, callbacks, openaiTools);
        return;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const isToolsUnsupported =
          msg.toLowerCase().includes('does not support tools') ||
          msg.toLowerCase().includes('tool_choice') ||
          (msg.toLowerCase().includes('tool') && msg.toLowerCase().includes('not supported'));

        if (!isToolsUnsupported) {
          callbacks.onError?.(error instanceof Error ? error : new Error(msg));
          throw error;
        }
        // Fall through to plain streaming
      }
    }

    await this._streamPlain(openaiMessages, callbacks);
  }

  private async _streamWithTools(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    callbacks: StreamCallbacks,
    tools: OpenAI.Chat.ChatCompletionTool[],
  ): Promise<void> {
    let fullResponse = '';
    const toolCallsInProgress: Map<number, { id: string; name: string; arguments: string }> =
      new Map();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      temperature: this.temperature,
      tools,
    });

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      if (delta?.content) {
        callbacks.onToken(delta.content);
        fullResponse += delta.content;
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index;
          if (!toolCallsInProgress.has(index)) {
            toolCallsInProgress.set(index, {
              id: toolCallDelta.id ?? '',
              name: toolCallDelta.function?.name ?? '',
              arguments: '',
            });
          }
          const tc = toolCallsInProgress.get(index)!;
          if (toolCallDelta.id) tc.id = toolCallDelta.id;
          if (toolCallDelta.function?.name) tc.name = toolCallDelta.function.name;
          if (toolCallDelta.function?.arguments) tc.arguments += toolCallDelta.function.arguments;
        }
      }

      if (finishReason === 'tool_calls') {
        for (const [, tc] of toolCallsInProgress) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(tc.arguments || '{}');
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            callbacks.onError?.(
              new Error(
                `Failed to parse tool call arguments for "${tc.name}": ${error.message}. Raw: ${tc.arguments}`,
              ),
            );
            continue;
          }
          const toolCall: ToolCall = { id: tc.id, name: tc.name, arguments: parsedArgs };
          callbacks.onToolCall?.(toolCall);
        }
        callbacks.onComplete(fullResponse);
      } else if (finishReason === 'stop') {
        callbacks.onComplete(fullResponse);
      }
    }
  }

  private async _streamPlain(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    callbacks: StreamCallbacks,
  ): Promise<void> {
    let fullResponse = '';

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
      temperature: this.temperature,
    });

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      if (delta?.content) {
        callbacks.onToken(delta.content);
        fullResponse += delta.content;
      }

      if (finishReason === 'stop') {
        callbacks.onComplete(fullResponse);
      }
    }
  }

  async refineNote(
    title: string,
    content: string,
    prompt: string,
  ): Promise<{ title: string; content: string }> {
    const systemPrompt = this.buildRefineNoteSystemPrompt();
    const userPrompt = this.buildRefineNotePrompt(title, content, prompt);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.structuredFormat(refineNoteOutputSchema, 'refine_note_output'),
    });

    this.storeUsage(response);
    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) throw new Error('Empty response from LM Studio');

    return this.parseResponse<{ title: string; content: string }>(
      responseContent,
      refineNoteOutputSchema,
    );
  }

  async transcribe(_audioBuffer: Buffer, _options?: TranscribeOptions): Promise<TranscriptionResult> {
    throw new Error(
      'Transcription is not supported by the LM Studio provider. Enable local whisper in settings.',
    );
  }

  async generateWeeklyReview(input: WeeklyReviewInput): Promise<WeeklyReviewOutput> {
    const userPrompt = this.buildWeeklyReviewPrompt(input);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a productivity coach helping users reflect on their week.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.structuredFormat(weeklyReviewOutputSchema, 'weekly_review_output'),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LM Studio');

    return this.parseResponse<WeeklyReviewOutput>(content, weeklyReviewOutputSchema);
  }

  async generateTemplateSuggestions(
    template: Template,
    weeklyReview?: WeeklyReviewOutput,
  ): Promise<TemplateSuggestionsOutput> {
    const userPrompt = this.buildTemplateSuggestionsPrompt(template, weeklyReview);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are a productivity coach helping users improve their organization templates.',
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.structuredFormat(templateSuggestionsOutputSchema, 'template_suggestions_output'),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from LM Studio');

    return this.parseResponse<TemplateSuggestionsOutput>(content, templateSuggestionsOutputSchema);
  }
}
