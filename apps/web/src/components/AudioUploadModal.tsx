import { useState, useRef, useEffect, useCallback } from 'react';
import { X, FileAudio, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { notesAPI, transcribeAPI } from '../api/client';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface AudioUploadModalProps {
  onClose: () => void;
  onTranscriptionComplete: () => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export default function AudioUploadModal({ onClose, onTranscriptionComplete }: AudioUploadModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearTimers = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  }, []);

  useEffect(() => {
    return clearTimers;
  }, [clearTimers]);

  const handleFileChange = (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;

    setPhase('uploading');
    setError(null);

    try {
      const allNotes = await notesAPI.list();
      const baseline = allNotes.filter((n: any) => n.tags?.includes('transcription')).length;

      await transcribeAPI.uploadFile(file);

      setPhase('processing');
      setElapsedSeconds(0);

      elapsedIntervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const current = await notesAPI.list();
          const count = current.filter((n: any) => n.tags?.includes('transcription')).length;
          if (count > baseline) {
            clearTimers();
            setPhase('done');
            onTranscriptionComplete();
          }
        } catch {
          // ignore transient poll errors
        }
      }, POLL_INTERVAL_MS);

      pollTimeoutRef.current = setTimeout(() => {
        clearTimers();
        setPhase('error');
        setError('Transcription is taking longer than expected. The note will appear when ready — you can close this modal.');
      }, POLL_TIMEOUT_MS);
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleTryAgain = () => {
    clearTimers();
    setPhase('idle');
    setFile(null);
    setError(null);
    setElapsedSeconds(0);
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={phase === 'processing' ? undefined : onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Upload Audio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {phase === 'idle' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
                  ${isDragging
                    ? 'border-purple-400 bg-purple-900/20'
                    : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/40'}`}
              >
                <FileAudio className="w-10 h-10 text-gray-400" />
                <p className="text-gray-300 font-medium">Drop an audio file here</p>
                <p className="text-gray-500 text-sm">or click to browse</p>
                <p className="text-gray-600 text-xs">MP3, M4A, WAV, WEBM, OGG, FLAC · up to 50MB</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.m4a,.flac,.webm,.mp4"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {/* Selected file chip */}
              {file && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg text-sm">
                  <FileAudio className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="flex-1 text-gray-300 truncate">{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p>Uploading file…</p>
            </div>
          )}

          {phase === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <p className="text-gray-300 font-medium">Transcribing audio…</p>
              <p className="text-gray-500 text-sm">Elapsed: {formatElapsed(elapsedSeconds)}</p>
              <p className="text-gray-600 text-xs text-center max-w-xs">
                You can close this modal — the transcription will continue in the background.
              </p>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
              <p className="text-gray-200 font-medium">Transcription complete</p>
              <p className="text-gray-500 text-sm">Your note has been added to the Notes page.</p>
            </div>
          )}

          {phase === 'error' && !error?.includes('taking longer') && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <p className="text-gray-300 font-medium">Something went wrong</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          {phase === 'idle' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file}
                className="btn-accent px-5 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </>
          )}

          {(phase === 'processing' || phase === 'done') && (
            <button onClick={onClose} className="btn-accent px-5 py-2">
              Close
            </button>
          )}

          {phase === 'error' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors">
                Close
              </button>
              <button onClick={handleTryAgain} className="btn-accent px-5 py-2">
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
