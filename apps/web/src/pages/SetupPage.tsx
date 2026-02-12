import { useState } from 'react';
import { Server, Check, AlertCircle, Loader2 } from 'lucide-react';
import { setApiUrl, testConnection } from '../api/config';

interface SetupPageProps {
  onComplete: () => void;
}

export default function SetupPage({ onComplete }: SetupPageProps) {
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    const success = await testConnection(serverUrl);

    setIsTesting(false);
    if (success) {
      setTestResult('success');
    } else {
      setTestResult('error');
      setError('Could not connect to server. Make sure the API is running.');
    }
  };

  const handleSave = () => {
    setApiUrl(serverUrl);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-4">
            <Server className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Mind Melder</h1>
          <p className="text-gray-400">
            Connect to your self-hosted Mind Melder server to get started.
          </p>
        </div>

        <div className="sheet-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Server URL</label>
            <input
              type="url"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setTestResult(null);
                setError(null);
              }}
              placeholder="http://localhost:3000"
              className="input-accent w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the URL where your Mind Melder API server is running
            </p>
          </div>

          {testResult === 'success' && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              <span>Connection successful!</span>
            </div>
          )}

          {testResult === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTest}
              disabled={isTesting || !serverUrl.trim()}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </span>
              ) : (
                'Test Connection'
              )}
            </button>

            <button
              onClick={handleSave}
              disabled={testResult !== 'success'}
              className="flex-1 btn-accent"
            >
              Connect
            </button>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Need help? Check the{' '}
          <a
            href="https://github.com/slayterdev/mind-melder"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            documentation
          </a>
        </p>
      </div>
    </div>
  );
}
