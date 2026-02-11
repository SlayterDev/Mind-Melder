import Anthropic from '@anthropic-ai/sdk';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type {
  LLMProvider, OrganizedOutput, ProviderConfig, TodaySheetInput,
  TodaySheetOutput, ChatMessage, StreamCallbacks, ToolCall, ToolDefinition,
  TranscribeOptions, TranscriptionResult
} from '../types.js';
import { organizedOutputSchema, todaySheetOutputSchema } from '../validation.js';

export class AnthropicProvider extends BaseLLMProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private temperature: number;

  constructor(config: ProviderConfig) {
    super();

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'claude-sonnet-4-5';
    this.temperature = config.temperature ?? 0.7;
  }

  async organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags, includeDescriptions ?? false);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: this.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return this.parseResponse<OrganizedOutput>(content.text, organizedOutputSchema);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      temperature: Math.min(this.temperature, 0.5),
      system: this.buildSystemPrompt(),
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    const result = this.parseResponse<{ todos: { content: string; dueDate?: string }[] }>(
      content.text
    );
    return result.todos;
  }

  async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildTodaySheetPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: Math.min(this.temperature, 0.5),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return this.parseResponse<TodaySheetOutput>(content.text, todaySheetOutputSchema);
  }

  async generateTitle(messages: ChatMessage[]): Promise<string> {
    const conversationText = messages
      .filter(m =>
        (m.role === 'user' || m.role === 'assistant') &&
        m.content
      )
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 30,
      temperature: 0.3,
      system: this.buildChatTitleSystemPrompt(),
      messages: [
        { role: 'user', content: conversationText },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return content.text.trim();
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks, tools?: ToolDefinition[]): Promise<void> {
    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');

    // Map messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = [];
    for (const m of messages) {
      if (m.role === 'system') continue;

      if (m.role === 'assistant' && m.toolCalls?.length) {
        // Assistant message with tool calls
        const content: Anthropic.ContentBlockParam[] = [];
        if (m.content) {
          content.push({ type: 'text', text: m.content });
        }
        for (const tc of m.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
        anthropicMessages.push({ role: 'assistant', content });
      } else if (m.role === 'tool') {
        // Tool result - must be in a user message
        if (!m.toolCallId) {
          throw new Error('AnthropicProvider.streamChat: tool message is missing required toolCallId');
        }
        anthropicMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: m.toolCallId,
            content: m.content ?? '',
          }],
        });
      } else {
        anthropicMessages.push({
          role: m.role as 'user' | 'assistant',
          content: m.content ?? '',
        });
      }
    }

    // Convert tools to Anthropic format
    const anthropicTools: Anthropic.Tool[] | undefined = tools?.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object' as const,
        properties: t.input_schema.properties,
        required: t.input_schema.required,
      },
    }));

    let fullTextResponse = '';

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      system: systemMessage?.content ?? this.buildSystemPrompt(),
      messages: anthropicMessages,
      temperature: this.temperature,
      ...(anthropicTools?.length ? { tools: anthropicTools } : {}),
    });

    stream.on('text', (token) => {
      callbacks.onToken(token);
      fullTextResponse += token;
    });

    // contentBlock fires when a content block is complete
    stream.on('contentBlock', (block) => {
      if (block.type === 'tool_use') {
        const toolCall: ToolCall = {
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        };
        callbacks.onToolCall?.(toolCall);
      }
    });

    stream.on('error', (error) => {
      callbacks.onError?.(error);
    });

    await stream.finalMessage();
    callbacks.onComplete(fullTextResponse);
  }

  async transcribe(_audioBuffer: Buffer, _options?: TranscribeOptions): Promise<TranscriptionResult> {
    throw new Error('Transcription is not supported by the Anthropic provider.');
  }
}
