import { useState, useRef, useCallback, useEffect } from 'react';

type RecordingState = 'idle' | 'requesting-permissions' | 'recording' | 'paused' | 'saving';

export function useAudioRecorder() {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<AudioPermissionStatus | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  const checkPermissions = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;
    const status = await api.checkAudioPermissions();
    setPermissionStatus(status);
    return status;
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const requestMicPermission = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return false;
    const granted = await api.requestMicrophonePermission();
    await checkPermissions();
    return granted;
  }, [checkPermissions]);

  const openScreenRecordingSettings = useCallback(() => {
    window.electronAPI?.openSystemPreferences('screen');
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Ignore
      }
      mediaRecorderRef.current = null;
    }
    // Close AudioContext BEFORE stopping tracks
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    streamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    streamsRef.current = [];
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const startRecording = useCallback(
    async (options: { micEnabled: boolean; systemAudioEnabled: boolean }) => {
      const api = window.electronAPI;
      if (!api) return;

      setError(null);
      setState('requesting-permissions');

      try {
        const streams: MediaStream[] = [];
        let micStream: MediaStream | null = null;
        let systemStream: MediaStream | null = null;

        // Get microphone stream with retry for device availability
        if (options.micEnabled) {
          let lastErr: Error | null = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              });
              break;
            } catch (err) {
              lastErr = err instanceof Error ? err : new Error(String(err));
              // Wait before retry to allow device release
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
          if (!micStream) {
            throw lastErr || new Error('Could not access microphone');
          }
          streams.push(micStream);
        }

        // Get system audio via getDisplayMedia + loopback (handled by main process)
        if (options.systemAudioEnabled) {
          systemStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true, // Required by Chromium; video track is stopped immediately
          });
          // Drop the video track — we only need audio
          systemStream.getVideoTracks().forEach((track) => track.stop());
          if (systemStream.getAudioTracks().length === 0) {
            throw new Error('System audio not available. Check Screen Recording permission.');
          }
          streams.push(systemStream);
        }

        if (streams.length === 0) {
          setError('No audio source selected');
          setState('idle');
          return;
        }

        streamsRef.current = streams;

        // Always route through AudioContext — its pull-based audio pipeline
        // ensures the stream's audio data is actively consumed and forwarded
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        audioContextRef.current = audioContext;
        const destination = audioContext.createMediaStreamDestination();

        for (const stream of streams) {
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(destination);
        }

        const recordStream = destination.stream;

        // Set up MediaRecorder — let it pick the best supported mimeType
        const mediaRecorder = new MediaRecorder(recordStream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(1000);
        setState('recording');
        startTimer();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start recording';
        setError(message);
        setState('idle');
        cleanup();
      }
    },
    [cleanup, startTimer]
  );

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    const api = window.electronAPI;
    if (!recorder || !api) return;

    setState('saving');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('Z', '');
      // Use .webm extension — MediaRecorder in Chromium always outputs WebM
      const filename = `recording-${timestamp}.webm`;

      await api.saveRecording({ buffer: base64, filename });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save recording';
      setError(message);
    }

    // Close AudioContext first, then stop tracks
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    streamsRef.current.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    streamsRef.current = [];
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    setElapsedSeconds(0);
    setState('idle');
  }, []);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    recorder.pause();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;

    recorder.resume();
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    setState('recording');
  }, []);

  return {
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
  };
}
