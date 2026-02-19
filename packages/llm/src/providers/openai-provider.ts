import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type { ChatMessage, LLMProvider, OrganizedOutput, ProviderConfig, StreamCallbacks, ToolCall, ToolDefinition, TodaySheetInput, TodaySheetOutput, TranscribeOptions, TranscriptionResult, WeeklyReviewInput, WeeklyReviewOutput, TemplateSuggestionsOutput } from '../types.js';
import { organizedOutputSchema, todaySheetOutputSchema, weeklyReviewOutputSchema, templateSuggestionsOutputSchema, extractTasksOutputSchema, refineNoteOutputSchema } from '../validation.js';
import { getAudioFilename } from '../utils/audio-utils.js';

/**
 * Recursively transforms a zodToJsonSchema output to be compatible with OpenAI strict mode:
 * - Adds `additionalProperties: false` to every object
 * - Moves all properties into `required`, wrapping formerly-optional ones as { anyOf: [..., null] }
 */
function toStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.type === 'object' && schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>>;
    const currentRequired = new Set<string>((schema.required as string[] | undefined) ?? []);
    const allKeys = Object.keys(props);

    const newProperties: Record<string, unknown> = {};
    for (const key of allKeys) {
      const val = toStrictSchema(props[key]);
      newProperties[key] = currentRequired.has(key) ? val : { anyOf: [val, { type: 'null' }] };
    }

    return { ...schema, properties: newProperties, required: allKeys, additionalProperties: false };
  }

  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: toStrictSchema(schema.items as Record<string, unknown>) };
  }

  if (Array.isArray(schema.anyOf)) {
    return { ...schema, anyOf: (schema.anyOf as Record<string, unknown>[]).map(toStrictSchema) };
  }

  return schema;
}

export class OpenAIProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  // gpt-5+ and o-series require Structured Outputs (json_schema); older models use json_object
  private readonly usesStructuredOutputs: boolean;

  constructor(config: ProviderConfig) {
    super();

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'gpt-5-mini';
    if (this.model.match(/^(o1|o3|o4|gpt-5)/i)) {
      this.temperature = 1; // Some models don't support other temp values
      this.usesStructuredOutputs = true;
    } else {
      var temp = config.temperature ?? 0.7;
      temp = Math.max(0.3, Math.min(temp, 1)); // Ensure temp is between 0 and 1
      this.temperature = temp;
      this.usesStructuredOutputs = false;
    }
  }

  /**
   * Returns the appropriate response_format for a structured completion request.
   * Newer models use json_schema (Structured Outputs); older models use json_object.
   */
  private responseFormat(name: string, zodSchema: ZodTypeAny): OpenAI.ResponseFormatJSONObject | OpenAI.ResponseFormatJSONSchema {
    if (!this.usesStructuredOutputs) {
      return { type: 'json_object' };
    }

    const raw = zodToJsonSchema(zodSchema, { $refStrategy: 'none' }) as Record<string, unknown>;
    const { $schema: _$schema, ...baseSchema } = raw;
    const strictSchema = toStrictSchema(baseSchema);

    return {
      type: 'json_schema',
      json_schema: { name, schema: strictSchema, strict: true },
    };
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

  async organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean, contentLockEnabled?: boolean): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags, includeDescriptions ?? false, contentLockEnabled ?? false);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.responseFormat('organized_output', organizedOutputSchema),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<OrganizedOutput>(content, organizedOutputSchema);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: this.temperature,
      response_format: this.responseFormat('extract_tasks_output', extractTasksOutputSchema),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const result = this.parseResponse<{ todos: { content: string; dueDate?: string }[] }>(content, extractTasksOutputSchema);
    return result.todos;
  }

  async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildTodaySheetPrompt(input);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.responseFormat('today_sheet_output', todaySheetOutputSchema),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<TodaySheetOutput>(content, todaySheetOutputSchema);
  }

  async generateTitle(messages: ChatMessage[]): Promise<string> {
    const conversationText = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role}: ${m.content ?? ''}`)
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
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content.trim();
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks, tools?: ToolDefinition[]): Promise<void> {
    let fullResponse = '';

    // Map our ChatMessage to OpenAI's expected format
    const openaiMessages = messages.map(m => {
      if (m.role === 'tool') {
        if (!m.toolCallId) {
          throw new Error('toolCallId is required for tool messages');
        }
        return {
          role: 'tool' as const,
          content: m.content ?? '',
          tool_call_id: m.toolCallId,
        };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: m.content ?? null,
          tool_calls: m.toolCalls.map(tc => ({
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

    // Convert tools to OpenAI format
    const openaiTools = tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: this.temperature,
      ...(openaiTools?.length ? { tools: openaiTools } : {}),
    });

    // Track tool calls being accumulated (they stream in chunks)
    const toolCallsInProgress: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of response) {
      // Final chunk with usage data (choices is empty)
      if (chunk.usage) {
        this.storeUsage({ usage: chunk.usage });
      }

      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      // Handle text content
      if (delta?.content) {
        callbacks.onToken(delta.content);
        fullResponse += delta.content;
      }

      // Handle tool calls (streamed incrementally)
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

      // Handle completion
      if (finishReason === 'tool_calls') {
        // All tool calls are complete, invoke callbacks
        for (const [, tc] of toolCallsInProgress) {
          let parsedArgs: Record<string, any> = {};
          try {
            parsedArgs = JSON.parse(tc.arguments || '{}');
          } catch (err) {
            // Surface JSON parse errors without crashing the whole stream
            const error = err instanceof Error ? err : new Error(String(err));
            callbacks.onError?.(
              new Error(
                `Failed to parse tool call arguments for tool "${tc.name}" (id: "${tc.id}"): ${error.message}. Raw arguments: ${tc.arguments}`,
              ),
            );
            // Skip this tool call and continue processing any others
            continue;
          }

          const toolCall: ToolCall = {
            id: tc.id,
            name: tc.name,
            arguments: parsedArgs,
          };
          callbacks.onToolCall?.(toolCall);
        }
        callbacks.onComplete(fullResponse);
      } else if (finishReason === 'stop') {
        callbacks.onComplete(fullResponse);
      }
    }
  }

  async refineNote(title: string, content: string, prompt: string): Promise<{ title: string; content: string }> {
    const systemPrompt = this.buildRefineNoteSystemPrompt();
    const userPrompt = this.buildRefineNotePrompt(title, content, prompt);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.responseFormat('refine_note_output', refineNoteOutputSchema),
    });

    this.storeUsage(response);
    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<{ title: string; content: string }>(responseContent, refineNoteOutputSchema);
  }

  async transcribe(audioBuffer: Buffer, options?: TranscribeOptions): Promise<TranscriptionResult> {
    const mimeType = options?.mimeType || 'audio/webm';
    const filename = getAudioFilename(mimeType, options?.filename);

    const file = new File([audioBuffer], filename, { type: mimeType });

    const response = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      ...(options?.language ? { language: options.language } : {}),
      ...(options?.prompt ? { prompt: options.prompt } : {}),
    });

    this.lastUsage = null; // Whisper API doesn't return token usage
    return { text: response.text };
  }

  async generateWeeklyReview(input: WeeklyReviewInput): Promise<WeeklyReviewOutput> {
    const userPrompt = this.buildWeeklyReviewPrompt(input);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: 'You are a productivity coach helping users reflect on their week.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.responseFormat('weekly_review_output', weeklyReviewOutputSchema),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<WeeklyReviewOutput>(content, weeklyReviewOutputSchema);
  }

  async generateTemplateSuggestions(template: Template, weeklyReview?: WeeklyReviewOutput): Promise<TemplateSuggestionsOutput> {
    const userPrompt = this.buildTemplateSuggestionsPrompt(template, weeklyReview);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: 'You are a productivity coach helping users improve their organization templates.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: this.responseFormat('template_suggestions_output', templateSuggestionsOutputSchema),
    });

    this.storeUsage(response);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<TemplateSuggestionsOutput>(content, templateSuggestionsOutputSchema);
  }
}
