import Anthropic from '@anthropic-ai/sdk';
import type { Capture, Template } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type { LLMProvider, OrganizedOutput, ProviderConfig, TodaySheetInput, TodaySheetOutput } from '../types.js';

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

  async organize(captures: Capture[], template: Template, tags?: string[]): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags);

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

    return this.parseResponse<OrganizedOutput>(content.text);
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

    return this.parseResponse<TodaySheetOutput>(content.text);
  }
}
