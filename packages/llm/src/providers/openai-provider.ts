import OpenAI from 'openai';
import type { Capture, Template } from 'types';
import { BaseLLMProvider } from '../base-provider';
import type { LLMProvider, OrganizedOutput, ProviderConfig, TodaySheetInput, TodaySheetOutput } from '../types';
import { organizedOutputSchema, todaySheetOutputSchema } from '../validation';

export class OpenAIProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: ProviderConfig) {
    super();

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model || 'gpt-4o-mini';
  }

  async organize(captures: Capture[], template: Template): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
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
      temperature: 0.5,
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
      temperature: 0.5, // More deterministic than organize
      response_format: { type: 'json_object' }, // Enforce JSON
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseResponse<TodaySheetOutput>(content, todaySheetOutputSchema);
  }
}
