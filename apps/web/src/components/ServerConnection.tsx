import { Server, Check, AlertCircle, Loader2 } from 'lucide-react';
import { getServerUrl } from '../api/config';

/**
 * Props for the ServerConnection component
 */
export interface ServerConnectionProps {
  /** Current server URL value */
  serverUrl: string;
  /** Callback to update server URL */
  setServerUrl: (url: string) => void;
  /** Whether a connection test is in progress */
  isTesting: boolean;
  /** Current connection test status */
  connectionStatus: 'idle' | 'success' | 'error';
  /** Callback to update connection status */
  setConnectionStatus: (status: 'idle' | 'success' | 'error') => void;
  /** Async function to test server connection */
  handleTestConnection: () => Promise<void>;
  /** Function to save connection and reload the app */
  handleSaveConnection: () => void;
}

/**
 * ServerConnection component - Renders server connection settings for Electron app
 *
 * This component is only used in the Electron version of the app to allow users
 * to configure and test the API server URL. It provides:
 * - Editable server URL input
 * - Connection test functionality
 * - Save and reconnect capability
 *
 * The component is displayed in two contexts:
 * 1. When settings load successfully (normal settings view)
 * 2. When settings fail to load (error state) - allows users to fix connection issues
 *
 * @param props - Component props
 * @returns ServerConnection UI component
 */
export default function ServerConnection({
  serverUrl,
  setServerUrl,
  isTesting,
  connectionStatus,
  setConnectionStatus,
  handleTestConnection,
  handleSaveConnection,
}: ServerConnectionProps) {
  return (
    <div className="sheet-card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Server className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold">Server Connection</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Server URL</label>
          <input
            type="url"
            value={serverUrl}
            onChange={(e) => {
              setServerUrl(e.target.value);
              setConnectionStatus('idle');
            }}
            placeholder="http://localhost:3000"
            className="input-accent w-full max-w-md"
          />
          <p className="text-xs text-gray-500 mt-1">
            The URL where your Mind Melder API server is running
          </p>
        </div>

        {connectionStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Check className="w-4 h-4" />
            <span>Connection successful!</span>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Could not connect to server</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !serverUrl.trim()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isTesting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </span>
            ) : (
              'Test Connection'
            )}
          </button>

          <button
            onClick={handleSaveConnection}
            disabled={connectionStatus !== 'success' || serverUrl === getServerUrl()}
            className="btn-accent"
          >
            Save & Reconnect
          </button>
        </div>
      </div>
    </div>
  );
}
