import OpenAI from 'openai';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type { ChatMessage, LLMProvider, OrganizedOutput, ProviderConfig, StreamCallbacks, TodaySheetInput, TodaySheetOutput } from '../types.js';
import { organizedOutputSchema, todaySheetOutputSchema } from '../validation.js';

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

  async organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags, includeDescriptions ?? false);

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

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    let fullResponse = '';

    // Map our ChatMessage to OpenAI's expected format
    const openaiMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content ?? '',
          tool_call_id: m.toolCallId ?? '',
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

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      stream: true,
    });

    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        callbacks.onToken(delta.content);
        fullResponse += delta.content;
      }

      // TODO: Handle tool calls and arguments in the stream

      if (chunk.choices[0]?.finish_reason === 'stop') {
        callbacks.onComplete(fullResponse);
      }
    }
  }
}
