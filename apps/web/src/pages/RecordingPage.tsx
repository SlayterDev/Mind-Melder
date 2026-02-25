import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Monitor, Pause, Play, Square, Loader2, Headphones, Check, AlertCircle, FolderOpen } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import RecordingPermissionPrompt from '../components/RecordingPermissionPrompt';
import { transcribeAPI } from '../api/client';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type TranscriptionStatus = null | 'uploading' | 'sent' | 'error';

export default function RecordingPage() {
  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const syncHeight = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const height = el.scrollHeight;
    window.electronAPI?.resizeRecordingWindow(height);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observerRef.current = new ResizeObserver(syncHeight);
    observerRef.current.observe(el);
    syncHeight();
    return () => observerRef.current?.disconnect();
  }, [syncHeight]);

  const {
    state,
    elapsedSeconds,
    error,
    permissionStatus,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    checkPermissions,
    requestMicPermission,
    openScreenRecordingSettings,
  } = useAudioRecorder();

  const handleClose = () => {
    window.electronAPI?.closeRecordingWindow();
  };

  const handleRecord = () => {
    startRecording({ micEnabled, systemAudioEnabled });
  };

  const handleStop = async () => {
    const blob = await stopRecording();
    if (!blob) return;

    setTranscriptionStatus('uploading');
    try {
      await transcribeAPI.upload(blob);
      setTranscriptionStatus('sent');
    } catch {
      setTranscriptionStatus('error');
    }
    // Auto-clear status after 4 seconds
    setTimeout(() => setTranscriptionStatus(null), 4000);
  };

  const handleMicPermission = async () => {
    if (permissionStatus?.microphone === 'not-determined') {
      await requestMicPermission();
    } else {
      window.electronAPI?.openSystemPreferences('microphone');
    }
  };

  const isIdle = state === 'idle';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isSaving = state === 'saving';
  const isActive = isRecording || isPaused;

  // Only gate on microphone permission — screen/system-audio permission is
  // unreliable on macOS 15+ (getMediaAccessStatus('screen') can report
  // 'denied' even when granted).  If system audio capture actually fails,
  // the error from getDisplayMedia is already caught and shown in the UI.
  const needsPermissions =
    permissionStatus &&
    micEnabled && permissionStatus.microphone !== 'granted';

  return (
    <div
      ref={containerRef}
      className="bg-gray-900 text-gray-100 flex flex-col select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-sm font-medium text-gray-300">
          {isActive ? 'Recording' : 'Record Audio'}
        </span>
        {!isActive && (
          <div
            className="flex items-center gap-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => window.electronAPI?.openRecordingsFolder()}
              title="Open recordings folder"
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className="flex flex-col px-4 pb-4"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {error && (
          <div className="text-red-400 text-xs bg-red-900/20 rounded px-3 py-2 mb-2">{error}</div>
        )}

        {state === 'requesting-permissions' && (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-400">Starting...</span>
          </div>
        )}

        {isSaving && (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            <span className="text-sm text-gray-400">Saving...</span>
          </div>
        )}

        {isIdle && (
          <>
            {needsPermissions && permissionStatus ? (
              <RecordingPermissionPrompt
                permissionStatus={permissionStatus}
                systemAudioEnabled={systemAudioEnabled}
                onRequestMicPermission={handleMicPermission}
                onOpenScreenSettings={openScreenRecordingSettings}
                onCheckAgain={checkPermissions}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">System Audio</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={systemAudioEnabled}
                    aria-label="Toggle system audio"
                    onClick={() => setSystemAudioEnabled(!systemAudioEnabled)}
                    className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${
                      systemAudioEnabled ? 'bg-accent' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                        systemAudioEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Microphone</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={micEnabled}
                    aria-label="Toggle microphone"
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${
                      micEnabled ? 'bg-accent' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                        micEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {micEnabled && systemAudioEnabled && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 px-1">
                <Headphones className="w-3 h-3 shrink-0" />
                <span>Use headphones to avoid audio doubling</span>
              </div>
            )}

            <div className="flex flex-col items-center gap-2 mt-3">
              <button
                onClick={handleRecord}
                disabled={(!micEnabled && !systemAudioEnabled) || !!needsPermissions}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
              >
                <div className="w-5 h-5 bg-white rounded-full" />
              </button>

              {transcriptionStatus === 'uploading' && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Transcribing...</span>
                </div>
              )}
              {transcriptionStatus === 'sent' && (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <Check className="w-3 h-3" />
                  <span>Sent for transcription</span>
                </div>
              )}
              {transcriptionStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>Transcription failed</span>
                </div>
              )}
            </div>
          </>
        )}

        {isActive && (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full bg-red-500 ${
                  isRecording ? 'recording-dot-pulse' : ''
                }`}
              />
              <span className="text-3xl font-mono text-gray-100 tabular-nums">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-3 text-gray-400">
              {systemAudioEnabled && <Monitor className="w-4 h-4" />}
              {micEnabled && <Mic className="w-4 h-4" />}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-gray-200" />
                ) : (
                  <Pause className="w-5 h-5 text-gray-200" />
                )}
              </button>

              <button
                onClick={handleStop}
                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center"
              >
                <Square className="w-5 h-5 text-white fill-white" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
