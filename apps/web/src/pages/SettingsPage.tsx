import { useState, useEffect } from 'react';
import { settingsAPI, type Settings } from '../api/client';
import { Cog, ChevronDown, ChevronUp } from 'lucide-react';

const PROVIDER_MODELS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  openai: {
    label: 'OpenAI',
    models: [
      { value: '', label: 'Default (gpt-4o-mini)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    models: [
      { value: '', label: 'Default (claude-sonnet-4-5)' },
      { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
      { value: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
      { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
    ],
  },
  ollama: {
    label: 'Ollama (Local)',
    models: [
      { value: '', label: 'Default (mistral)' },
      { value: 'mistral', label: 'Mistral' },
      { value: 'llama3.1', label: 'Llama 3.1' },
      { value: 'llama3.1:70b', label: 'Llama 3.1 70B' },
      { value: 'codellama', label: 'Code Llama' },
      { value: 'mixtral', label: 'Mixtral' },
    ],
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await settingsAPI.get();
      setSettings(data);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleUpdate = async (updates: Partial<Settings>) => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    try {
      const updated = await settingsAPI.update(updates);
      setSettings(updated);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Failed to update settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Failed to load settings'}</p>
        <button onClick={loadSettings} className="btn-accent">
          Retry
        </button>
      </div>
    );
  }

  const currentProvider = PROVIDER_MODELS[settings.llmProvider];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Settings</h2>
          <p className="text-gray-400">Configure your LLM provider and preferences</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* LLM Provider Section */}
        <div className="sheet-card p-6">
          <h3 className="text-lg font-semibold mb-4">LLM Provider</h3>

          <div className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider
              </label>
              <div className="flex gap-2">
                {Object.entries(PROVIDER_MODELS).map(([key, { label }]) => (
                  <button
                    key={key}
                    onClick={() => handleUpdate({ llmProvider: key as Settings['llmProvider'], llmModel: null })}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      settings.llmProvider === key
                        ? 'bg-accent text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Model
              </label>
              <select
                value={settings.llmModel || ''}
                onChange={(e) => handleUpdate({ llmModel: e.target.value || null })}
                disabled={isSaving}
                className="input-accent w-full max-w-md"
              >
                {currentProvider.models.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="sheet-card">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-6 flex items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold">Advanced Settings</h3>
            {showAdvanced ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-800 pt-4">
              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Temperature: {settings.llmTemperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.llmTemperature}
                  onChange={(e) => handleUpdate({ llmTemperature: parseFloat(e.target.value) })}
                  disabled={isSaving}
                  className="w-full max-w-md accent-accent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower values (0.0-0.3) are more focused, higher values (0.7-1.0) are more creative
                </p>
              </div>

              {/* Ollama Base URL (conditional) */}
              {settings.llmProvider === 'ollama' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ollama Server URL
                  </label>
                  <input
                    type="url"
                    value={settings.ollamaBaseUrl}
                    onChange={(e) => handleUpdate({ ollamaBaseUrl: e.target.value })}
                    disabled={isSaving}
                    placeholder="http://localhost:11434"
                    className="input-accent w-full max-w-md"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule Settings */}
        <div className="sheet-card p-6">
          <h3 className="text-lg font-semibold mb-4">Organization Schedule</h3>

          <div className="space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdate({ scheduleEnabled: !settings.scheduleEnabled })}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.scheduleEnabled ? 'bg-accent' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.scheduleEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
              <span className="text-gray-300">
                {settings.scheduleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {/* Cron Schedule */}
            <div className={settings.scheduleEnabled ? '' : 'opacity-50'}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schedule (cron format)
              </label>
              <input
                type="text"
                value={settings.organizationSchedule}
                onChange={(e) => handleUpdate({ organizationSchedule: e.target.value })}
                disabled={isSaving || !settings.scheduleEnabled}
                placeholder="0 17 * * *"
                className="input-accent w-full max-w-md font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: "0 17 * * *" (5:00 PM daily). Format: minute hour day month weekday
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="sheet-card-inner p-6">
          <div className="flex items-start gap-4">
            <Cog className="w-8 h-8 text-gray-400 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-gray-200 mb-1">API Keys</h4>
              <p className="text-sm text-gray-400">
                API keys are configured in your server's .env file for security.
                Only non-sensitive settings like provider selection and model preferences
                are stored in the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
