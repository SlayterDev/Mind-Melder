import { Shield, Mic, Monitor, Check } from 'lucide-react';

interface RecordingPermissionPromptProps {
  permissionStatus: AudioPermissionStatus;
  systemAudioEnabled: boolean;
  onRequestMicPermission: () => void;
  onOpenScreenSettings: () => void;
  onCheckAgain: () => void;
}

export default function RecordingPermissionPrompt({
  permissionStatus,
  systemAudioEnabled,
  onRequestMicPermission,
  onOpenScreenSettings,
  onCheckAgain,
}: RecordingPermissionPromptProps) {
  const micGranted = permissionStatus.microphone === 'granted';
  const screenGranted = permissionStatus.screen === 'granted';
  const micNotDetermined = permissionStatus.microphone === 'not-determined';

  const needsMic = !micGranted;
  const needsScreen = systemAudioEnabled && !screenGranted;

  if (!needsMic && !needsScreen) return null;

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center gap-2 text-gray-300 text-sm">
        <Shield className="w-4 h-4" />
        <span>Permissions needed</span>
      </div>

      {/* Microphone permission */}
      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Mic className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">Microphone</span>
        </div>
        {micGranted ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <button
            onClick={onRequestMicPermission}
            className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
          >
            {micNotDetermined ? 'Grant Access' : 'Open Settings'}
          </button>
        )}
      </div>

      {/* Screen recording permission */}
      {systemAudioEnabled && (
        <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Monitor className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Screen Recording</span>
          </div>
          {screenGranted ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenScreenSettings}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                Open Settings
              </button>
              <button
                onClick={onCheckAgain}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                Check
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
