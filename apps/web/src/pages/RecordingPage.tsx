import { useState, useEffect } from 'react';
import { X, Mic, Monitor, Pause, Play, Square, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import RecordingPermissionPrompt from '../components/RecordingPermissionPrompt';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface DiagnosticInfo {
  devices: string;
  getUserMediaResult: string;
  trackState: string;
  audioContextState: string;
  hasAudioData: string;
}

function useDiagnostics() {
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);

  useEffect(() => {
    async function run() {
      const result: DiagnosticInfo = {
        devices: 'checking...',
        getUserMediaResult: 'pending',
        trackState: 'pending',
        audioContextState: 'pending',
        hasAudioData: 'pending',
      };

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        result.devices = audioInputs.map((d) => d.label || d.deviceId).join(', ') || 'none found';
        setInfo({ ...result });
      } catch (e) {
        result.devices = `error: ${e}`;
        setInfo({ ...result });
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        result.getUserMediaResult = 'success';
        const track = stream.getAudioTracks()[0];
        result.trackState = track
          ? `readyState=${track.readyState}, enabled=${track.enabled}, muted=${track.muted}, label="${track.label}"`
          : 'no audio track';
        setInfo({ ...result });
      } catch (e) {
        result.getUserMediaResult = `error: ${e instanceof Error ? e.message : e}`;
        setInfo({ ...result });
        return;
      }

      try {
        const ctx = new AudioContext();
        result.audioContextState = ctx.state;
        if (ctx.state === 'suspended') {
          await ctx.resume();
          result.audioContextState = `resumed -> ${ctx.state}`;
        }

        // Check for actual audio data using AnalyserNode
        const source = ctx.createMediaStreamSource(stream!);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Sample audio levels over 1 second
        let maxLevel = 0;
        const checkInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const level = Math.max(...dataArray);
          if (level > maxLevel) maxLevel = level;
        }, 100);

        await new Promise((r) => setTimeout(r, 1000));
        clearInterval(checkInterval);

        result.hasAudioData = maxLevel > 0 ? `yes (peak=${maxLevel}/255)` : 'NO - mic appears silent';

        ctx.close();
        stream!.getTracks().forEach((t) => t.stop());
        setInfo({ ...result });
      } catch (e) {
        result.audioContextState = `error: ${e instanceof Error ? e.message : e}`;
        stream?.getTracks().forEach((t) => t.stop());
        setInfo({ ...result });
      }
    }
    run();
  }, []);

  return info;
}

export default function RecordingPage() {
  const [micEnabled, setMicEnabled] = useState(true);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
  const diagnostics = useDiagnostics();

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

  const needsPermissions =
    permissionStatus &&
    (permissionStatus.microphone !== 'granted' ||
      (systemAudioEnabled && permissionStatus.screen !== 'granted'));

  return (
    <div
      className="h-screen bg-gray-900 text-gray-100 flex flex-col select-none overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-sm font-medium text-gray-300">
          {isActive ? 'Recording' : 'Record Audio'}
        </span>
        {!isActive && (
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col px-4 pb-4 overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {error && (
          <div className="text-red-400 text-xs bg-red-900/20 rounded px-3 py-2 mb-2">{error}</div>
        )}

        {isSaving && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
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
                <label className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 cursor-pointer">
                  <div className="flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">System Audio</span>
                  </div>
                  <div
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
                  </div>
                </label>

                <label className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 cursor-pointer">
                  <div className="flex items-center gap-2 text-sm">
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Microphone</span>
                  </div>
                  <div
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
                  </div>
                </label>
              </div>
            )}

            <div className="flex-1 flex items-center justify-center mt-3">
              <button
                onClick={handleRecord}
                disabled={(!micEnabled && !systemAudioEnabled) || !!needsPermissions}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg"
              >
                <div className="w-5 h-5 bg-white rounded-full" />
              </button>
            </div>
          </>
        )}

        {isActive && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
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
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center"
              >
                <Square className="w-5 h-5 text-white fill-white" />
              </button>
            </div>
          </div>
        )}

        {/* Diagnostics */}
        {diagnostics && (
          <div className="mt-3 border-t border-gray-700 pt-2 text-[10px] text-gray-500 space-y-0.5 font-mono">
            <div>
              <span className="text-gray-600">devices:</span> {diagnostics.devices}
            </div>
            <div>
              <span className="text-gray-600">getUserMedia:</span>{' '}
              {diagnostics.getUserMediaResult}
            </div>
            <div>
              <span className="text-gray-600">track:</span> {diagnostics.trackState}
            </div>
            <div>
              <span className="text-gray-600">audioCtx:</span> {diagnostics.audioContextState}
            </div>
            <div>
              <span className="text-gray-600">audioData:</span>{' '}
              <span
                className={
                  diagnostics.hasAudioData.startsWith('NO') ? 'text-red-400' : 'text-green-400'
                }
              >
                {diagnostics.hasAudioData}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
