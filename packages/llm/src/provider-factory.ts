import type { LLMProvider, SettingsConfig } from './types.js';
import { OpenAIProvider } from './providers/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { OllamaProvider } from './providers/ollama-provider.js';

export type ProviderType = 'openai' | 'anthropic' | 'ollama';

export class ProviderFactory {
  static createProvider(
    type: ProviderType,
    config: {
      apiKey?: string;
      baseURL?: string;
      model?: string;
      temperature?: number;
    } = {}
  ): LLMProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey || process.env.OPENAI_API_KEY,
          model: config.model,
          temperature: config.temperature,
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
          model: config.model,
          temperature: config.temperature,
        });

      case 'ollama':
        return new OllamaProvider({
          baseURL: config.baseURL || process.env.OLLAMA_BASE_URL,
          model: config.model,
          temperature: config.temperature,
        });

      default:
        throw new Error(`Unknown LLM provider: ${type}`);
    }
  }

  static createFromEnv(): LLMProvider {
    const providerType = (process.env.LLM_PROVIDER || 'openai').toLowerCase() as ProviderType;

    if (!['openai', 'anthropic', 'ollama'].includes(providerType)) {
      throw new Error(
        `Invalid LLM_PROVIDER: ${providerType}. Must be one of: openai, anthropic, ollama`
      );
    }

    return this.createProvider(providerType);
  }

  static createFromSettings(settings: SettingsConfig): LLMProvider {
    const providerType = settings.llmProvider;

    return this.createProvider(providerType, {
      model: settings.llmModel || undefined,
      temperature: settings.llmTemperature,
      baseURL: providerType === 'ollama' ? settings.ollamaBaseUrl : undefined,
    });
  }
}
