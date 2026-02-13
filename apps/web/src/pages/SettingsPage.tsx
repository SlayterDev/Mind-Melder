import { useState, useEffect, useCallback } from 'react';
import { settingsAPI, ollamaAPI, type Settings, type OllamaModel } from '../api/client';
import { Cog, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getServerUrl, setApiUrl, testConnection } from '../api/config';
import ServerConnection from '../components/ServerConnection';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

// Default values for settings fields
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_SCHEDULE = '0 17 * * *';

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
    models: [], // Populated dynamically
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server connection state (Electron only)
  const [serverUrl, setServerUrl] = useState(getServerUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Local state for text inputs to prevent defocus on keystroke
  const [localOllamaUrl, setLocalOllamaUrl] = useState('');
  const [localWhisperUrl, setLocalWhisperUrl] = useState('');
  const [localTodaySheetTime, setLocalTodaySheetTime] = useState('');
  const [localOrganizeTime, setLocalOrganizeTime] = useState('');

  // Track which fields are currently being edited to avoid overwriting user input
  const [isEditingOllamaUrl, setIsEditingOllamaUrl] = useState(false);
  const [isEditingWhisperUrl, setIsEditingWhisperUrl] = useState(false);
  const [isEditingTodaySheetTime, setIsEditingTodaySheetTime] = useState(false);
  const [isEditingOrganizeTime, setIsEditingOrganizeTime] = useState(false);

  // Ollama models state
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false);
  const [ollamaModelsError, setOllamaModelsError] = useState<string | null>(null);

  const fetchOllamaModels = useCallback(async (autoSelectFirst = false) => {
    setIsLoadingOllamaModels(true);
    setOllamaModelsError(null);
    try {
      const response = await ollamaAPI.listModels();
      setOllamaModels(response.models);
      if (response.error) {
        setOllamaModelsError(response.error);
      }
      // Auto-select first model if none selected and models available
      if (autoSelectFirst && response.models.length > 0 && !settings?.llmModel) {
        handleUpdate({ llmModel: response.models[0].name });
      }
    } catch (err) {
      setOllamaModelsError('Failed to fetch Ollama models');
      console.error('Failed to fetch Ollama models:', err);
    } finally {
      setIsLoadingOllamaModels(false);
    }
  }, [settings?.llmModel]);

  // Fetch Ollama models when provider is ollama
  useEffect(() => {
    if (settings?.llmProvider === 'ollama') {
      fetchOllamaModels(true); // Auto-select first model if none selected
    }
  }, [settings?.llmProvider, fetchOllamaModels]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('idle');

    const success = await testConnection(serverUrl);

    setIsTesting(false);
    setConnectionStatus(success ? 'success' : 'error');
  };

  const handleSaveConnection = () => {
    setApiUrl(serverUrl);
    setConnectionStatus('success');
    // Reload to apply new API URL
    window.location.reload();
  };

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await settingsAPI.get();
      setSettings(data);
      // Initialize local state from loaded settings
      setLocalOllamaUrl(data.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL);
      setLocalWhisperUrl(data.whisperUrl ?? 'http://127.0.0.1:3005');
      setLocalTodaySheetTime(data.todaySheetTime ?? '08:00');
      setLocalOrganizeTime(data.organizeScheduleTime ?? '17:00');
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

  // Sync local state when settings change (but don't overwrite active edits)
  useEffect(() => {
    if (settings) {
      if (!isEditingOllamaUrl) {
        setLocalOllamaUrl(settings.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL);
      }
      if (!isEditingWhisperUrl) {
        setLocalWhisperUrl(settings.whisperUrl ?? 'http://127.0.0.1:3005');
      }
      if (!isEditingTodaySheetTime) {
        setLocalTodaySheetTime(settings.todaySheetTime ?? '08:00');
      }
      if (!isEditingOrganizeTime) {
        setLocalOrganizeTime(settings.organizeScheduleTime ?? '17:00');
      }
    }
  }, [settings, isEditingOllamaUrl, isEditingWhisperUrl, isEditingTodaySheetTime, isEditingOrganizeTime]);

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
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Settings</h2>
            <p className="text-gray-400">Configure your LLM provider and preferences</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
          {error || 'Failed to load settings'}
        </div>

        {/* Server Connection (Electron only) - Always show even when settings fail */}
        {isElectron && (
          <ServerConnection
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            isTesting={isTesting}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            handleTestConnection={handleTestConnection}
            handleSaveConnection={handleSaveConnection}
          />
        )}

        <div className="text-center">
          <button onClick={loadSettings} className="btn-accent">
            Retry
          </button>
        </div>
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
              {settings.llmProvider === 'ollama' ? (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <select
                      value={settings.llmModel || ''}
                      onChange={(e) => handleUpdate({ llmModel: e.target.value || null })}
                      disabled={isSaving || isLoadingOllamaModels}
                      className="input-accent w-full max-w-md"
                    >
                      {ollamaModels.length === 0 && (
                        <option value="">No models found</option>
                      )}
                      {ollamaModels.map((model) => (
                        <option key={model.name} value={model.name}>
                          {model.name} - {(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => fetchOllamaModels()}
                      disabled={isLoadingOllamaModels}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Refresh models"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingOllamaModels ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  {isLoadingOllamaModels && (
                    <p className="text-xs text-gray-500">Loading models from Ollama...</p>
                  )}
                  {ollamaModelsError && (
                    <p className="text-xs text-amber-400">{ollamaModelsError}</p>
                  )}
                  {!isLoadingOllamaModels && !ollamaModelsError && ollamaModels.length === 0 && (
                    <p className="text-xs text-gray-500">No models found. Pull a model with: ollama pull llama3.1</p>
                  )}
                </div>
              ) : (
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
              )}
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
                    value={localOllamaUrl}
                    onChange={(e) => setLocalOllamaUrl(e.target.value)}
                    onFocus={() => setIsEditingOllamaUrl(true)}
                    onBlur={async () => {
                      setIsEditingOllamaUrl(false);
                      const currentValue = settings.ollamaBaseUrl ?? DEFAULT_OLLAMA_URL;
                      if (localOllamaUrl !== currentValue) {
                        await handleUpdate({ ollamaBaseUrl: localOllamaUrl });
                        // Refresh models after URL change
                        fetchOllamaModels();
                      }
                    }}
                    disabled={isSaving}
                    placeholder={DEFAULT_OLLAMA_URL}
                    className="input-accent w-full max-w-md"
                  />
                </div>
              )}

              {/* Local Whisper */}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300">
                      Local Whisper
                    </label>
                    <p className="text-xs text-gray-500">
                      Use a local whisper.cpp server for audio transcription
                    </p>
                  </div>
                  <button
                    onClick={() => handleUpdate({ whisperEnabled: !settings.whisperEnabled })}
                    disabled={isSaving}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.whisperEnabled ? 'bg-accent' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.whisperEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings.whisperEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Whisper Server URL
                    </label>
                    <input
                      type="url"
                      value={localWhisperUrl}
                      onChange={(e) => setLocalWhisperUrl(e.target.value)}
                      onFocus={() => setIsEditingWhisperUrl(true)}
                      onBlur={async () => {
                        setIsEditingWhisperUrl(false);
                        const currentValue = settings.whisperUrl ?? 'http://127.0.0.1:3005';
                        if (localWhisperUrl !== currentValue) {
                          await handleUpdate({ whisperUrl: localWhisperUrl });
                        }
                      }}
                      disabled={isSaving}
                      placeholder="http://127.0.0.1:3005"
                      className="input-accent w-full max-w-md"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI Behavior */}
        <div className="sheet-card p-6">
          <h3 className="text-lg font-semibold mb-4">AI Behavior</h3>
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Content Lock
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Preserve original capture and todo text. AI will not rewrite titles or existing descriptions.
              </p>
            </div>
            <button
              onClick={() => handleUpdate({ contentLockEnabled: !settings.contentLockEnabled })}
              disabled={isSaving}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.contentLockEnabled ? 'bg-accent' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.contentLockEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Schedule Settings */}
        <div className="sheet-card p-6">
          <h3 className="text-lg font-semibold mb-6">Scheduled Generation</h3>

          {/* Today Sheet Schedule */}
          <div className="space-y-4 pb-6 border-b border-gray-700">
            <h4 className="text-md font-medium text-gray-300">Today Sheet Generation</h4>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdate({ todaySheetScheduleEnabled: !settings.todaySheetScheduleEnabled })}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.todaySheetScheduleEnabled ? 'bg-accent' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.todaySheetScheduleEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
              <span className="text-gray-300">
                {settings.todaySheetScheduleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className={settings.todaySheetScheduleEnabled ? '' : 'opacity-50'}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Generation Time (Daily)
              </label>
              <input
                type="time"
                value={localTodaySheetTime}
                onChange={(e) => setLocalTodaySheetTime(e.target.value)}
                onFocus={() => setIsEditingTodaySheetTime(true)}
                onBlur={() => {
                  setIsEditingTodaySheetTime(false);
                  const currentValue = settings.todaySheetTime ?? '08:00';
                  if (localTodaySheetTime !== currentValue) {
                    handleUpdate({ todaySheetTime: localTodaySheetTime });
                  }
                }}
                disabled={isSaving || !settings.todaySheetScheduleEnabled}
                className="input-accent w-48"
              />
              <p className="text-xs text-gray-500 mt-1">
                Today Sheet will be generated daily at this time
              </p>
            </div>
          </div>

          {/* Organization Schedule */}
          <div className="space-y-4 pt-6">
            <h4 className="text-md font-medium text-gray-300">Organization Flow</h4>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdate({ organizeScheduleEnabled: !settings.organizeScheduleEnabled })}
                disabled={isSaving}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.organizeScheduleEnabled ? 'bg-accent' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.organizeScheduleEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
              <span className="text-gray-300">
                {settings.organizeScheduleEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className={settings.organizeScheduleEnabled ? 'space-y-3' : 'opacity-50 space-y-3'}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Frequency
                </label>
                <select
                  value={settings.organizeScheduleFrequency}
                  onChange={(e) => handleUpdate({ organizeScheduleFrequency: e.target.value as 'daily' | 'weekly' })}
                  disabled={isSaving || !settings.organizeScheduleEnabled}
                  className="input-accent w-48"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {settings.organizeScheduleFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Day of Week
                  </label>
                  <select
                    value={settings.organizeScheduleWeekday}
                    onChange={(e) => handleUpdate({ organizeScheduleWeekday: e.target.value })}
                    disabled={isSaving || !settings.organizeScheduleEnabled}
                    className="input-accent w-48"
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={localOrganizeTime}
                  onChange={(e) => setLocalOrganizeTime(e.target.value)}
                  onFocus={() => setIsEditingOrganizeTime(true)}
                  onBlur={() => {
                    setIsEditingOrganizeTime(false);
                    const currentValue = settings.organizeScheduleTime ?? '17:00';
                    if (localOrganizeTime !== currentValue) {
                      handleUpdate({ organizeScheduleTime: localOrganizeTime });
                    }
                  }}
                  disabled={isSaving || !settings.organizeScheduleEnabled}
                  className="input-accent w-48"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Captures will be organized {settings.organizeScheduleFrequency === 'weekly' ? 'weekly' : 'daily'} at this time
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Server Connection (Electron only) */}
        {isElectron && (
          <ServerConnection
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            isTesting={isTesting}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            handleTestConnection={handleTestConnection}
            handleSaveConnection={handleSaveConnection}
          />
        )}

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
