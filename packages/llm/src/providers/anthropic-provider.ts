import Anthropic from '@anthropic-ai/sdk';
import type { Capture, Template } from 'types';
import { BaseLLMProvider } from '../base-provider';
import type { LLMProvider, OrganizedOutput, ProviderConfig, TodaySheetInput, TodaySheetOutput } from '../types';

export class AnthropicProvider extends BaseLLMProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: ProviderConfig) {
    super();

    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'claude-3-5-sonnet-20241022';
  }

  async organize(captures: Capture[], template: Template): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return this.parseResponse<OrganizedOutput>(content.text);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
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
      temperature: 0.5, // More deterministic
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

    return this.parseResponse<TodaySheetOutput>(content.text);
  }
}
