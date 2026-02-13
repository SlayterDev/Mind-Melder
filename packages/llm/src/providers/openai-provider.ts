import OpenAI from 'openai';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type { ChatMessage, LLMProvider, OrganizedOutput, ProviderConfig, StreamCallbacks, ToolCall, ToolDefinition, TodaySheetInput, TodaySheetOutput, TranscribeOptions, TranscriptionResult } from '../types.js';
import { organizedOutputSchema, todaySheetOutputSchema } from '../validation.js';
import { getAudioFilename } from '../utils/audio-utils.js';

export class OpenAIProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;

  constructor(config: ProviderConfig) {
    super();

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'gpt-4o-mini';
    this.temperature = config.temperature ?? 0.7;
  }

  async organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean, contentLockEnabled?: boolean): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags, includeDescriptions ?? false, contentLockEnabled ?? false);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: this.temperature,
      response_format: { type: 'json_object' },
    });

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
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: Math.min(this.temperature, 0.5),
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const result = this.parseResponse<{ todos: { content: string; dueDate?: string }[] }>(content);
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
      temperature: Math.min(this.temperature, 0.5),
      response_format: { type: 'json_object' },
    });

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
      temperature: this.temperature,
      ...(openaiTools?.length ? { tools: openaiTools } : {}),
    });

    // Track tool calls being accumulated (they stream in chunks)
    const toolCallsInProgress: Map<number, { id: string; name: string; arguments: string }> = new Map();

    for await (const chunk of response) {
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
      temperature: Math.min(this.temperature, 0.5),
      response_format: { type: 'json_object' },
    });

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<{ title: string; content: string }>(responseContent);
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

    return { text: response.text };
  }
}
