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
}
