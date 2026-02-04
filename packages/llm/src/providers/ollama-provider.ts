import { Ollama } from 'ollama';
import type { Capture, Template, Tag } from 'types';
import { BaseLLMProvider } from '../base-provider.js';
import type { LLMProvider, OrganizedOutput, ProviderConfig, TodaySheetInput, TodaySheetOutput } from '../types.js';
import { organizedOutputSchema, todaySheetOutputSchema } from '../validation.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OllamaProvider extends BaseLLMProvider implements LLMProvider {
  private client: Ollama;
  private model: string;
  private temperature: number;

  constructor(config: ProviderConfig) {
    super();

    const baseURL = config.baseURL || 'http://localhost:11434';
    this.client = new Ollama({ host: baseURL });
    this.model = config.model || 'mistral';
    this.temperature = config.temperature ?? 0.7;
  }

  async organize(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions?: boolean): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template, tags, includeDescriptions ?? false);

    // Convert Zod schema to JSON schema for Ollama structured output
    const jsonSchema = zodToJsonSchema(organizedOutputSchema, 'organizedOutput');

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: jsonSchema,
      options: {
        temperature: this.temperature,
      },
    });

    return this.parseResponse<OrganizedOutput>(response.message.content, organizedOutputSchema);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    // Create a simple JSON schema for task extraction
    const taskExtractionSchema = {
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

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      stream: false,
      format: taskExtractionSchema,
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

    // Convert Zod schema to JSON schema for Ollama structured output
    const jsonSchema = zodToJsonSchema(todaySheetOutputSchema, 'todaySheetOutput');

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: jsonSchema,
      options: {
        temperature: Math.min(this.temperature, 0.5),
      },
    });

    return this.parseResponse<TodaySheetOutput>(response.message.content, todaySheetOutputSchema);
  }
}
