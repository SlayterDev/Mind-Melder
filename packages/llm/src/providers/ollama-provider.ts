import type { Capture, Template } from 'types';
import { BaseLLMProvider } from '../base-provider';
import type { LLMProvider, OrganizedOutput, ProviderConfig, TodaySheetInput, TodaySheetOutput } from '../types';

interface OllamaResponse {
  message: {
    content: string;
  };
}

export class OllamaProvider extends BaseLLMProvider implements LLMProvider {
  private baseURL: string;
  private model: string;

  constructor(config: ProviderConfig) {
    super();

    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.model = config.model || 'llama3.1';
  }

  async organize(captures: Capture[], template: Template): Promise<OrganizedOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOrganizePrompt(captures, template);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return this.parseResponse<OrganizedOutput>(data.message.content);
  }

  async extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]> {
    const prompt = this.buildTaskExtractionPrompt(text);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    const result = this.parseResponse<{ todos: { content: string; dueDate?: string }[] }>(
      data.message.content
    );
    return result.todos;
  }

  async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildTodaySheetPrompt(input);

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        format: 'json', // Ollama JSON mode
        options: {
          temperature: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return this.parseResponse<TodaySheetOutput>(data.message.content);
  }
}
