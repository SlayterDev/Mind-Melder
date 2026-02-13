import { useState } from 'react';
import { X, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { notesAPI } from '../api/client';

interface RefineNoteModalProps {
  note: { id: string; title: string; content: string, tags: string[] };
  onClose: () => void;
  onAccept: (data: { title: string; content: string }) => void;
}

type Phase = 'prompt' | 'loading' | 'preview';

export default function RefineNoteModal({ note, onClose, onAccept }: RefineNoteModalProps) {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [prompt, setPrompt] = useState(() => {
    if (note.tags.includes('transcription')) {
      return 'Clean up this audio transcription, fix any errors, and format it for better readability while preserving its content. Add a summary at the top if possible.';
    }

    return 'Clean up and organize the content of this note';
  });
  const [refined, setRefined] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setPhase('loading');
    setError(null);

    try {
      const result = await notesAPI.refine(note.id, prompt);
      setRefined(result);
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine note');
      setPhase('prompt');
    }
  };

  const handleTryAgain = () => {
    setPhase('prompt');
    setRefined(null);
  };

  const handleAccept = () => {
    if (refined) {
      onAccept(refined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">
            {phase === 'preview' ? 'Review Changes' : 'Refine Note'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {phase === 'prompt' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-gray-400 mb-1 block">
                  What would you like to do with this note?
                </span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="input-accent w-full h-32 resize-y"
                  placeholder="Describe how you'd like the note to be refined..."
                  autoFocus
                />
              </label>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Refining your note...</p>
            </div>
          )}

          {phase === 'preview' && refined && (
            <div className="space-y-4">
              {refined.title !== note.title && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Updated Title</span>
                  <p className="text-lg font-semibold text-gray-100 mt-1">{refined.title}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Preview</span>
                <div className="mt-2 p-4 bg-gray-800 rounded-lg border border-gray-700 prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {refined.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          {phase === 'prompt' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className="btn-accent px-5 py-2 disabled:opacity-50"
              >
                Refine
              </button>
            </>
          )}

          {phase === 'loading' && (
            <button
              onClick={() => setPhase('prompt')}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}

          {phase === 'preview' && (
            <>
              <button
                onClick={handleTryAgain}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleAccept}
                className="btn-accent px-5 py-2"
              >
                Accept
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
