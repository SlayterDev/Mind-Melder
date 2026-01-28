import { useState } from 'react';
import { capturesAPI } from '../api/client';

export default function CapturePage() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      await capturesAPI.create({ content: content.trim() });
      setContent('');
      setMessage('✓ Captured!');
      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to capture'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Quick Capture</h2>
        <p className="text-gray-400">
          Jot down thoughts, ideas, and tasks. They'll be organized automatically.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 shadow-lg shadow-black/20">
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type anything... (Press Cmd/Ctrl+Enter to submit)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-100 font-mono
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-500 resize-none shadow-inner"
            rows={6}
            disabled={isSubmitting}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm">
              {message && (
                <span
                  className={`${message.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}
                >
                  {message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500
                       text-white font-medium rounded-lg transition-colors
                       shadow-lg shadow-blue-900/30 border border-blue-500/30
                       disabled:shadow-none disabled:border-gray-600"
            >
              {isSubmitting ? 'Capturing...' : 'Capture'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-gray-900/50 border border-gray-800/50 rounded-lg p-4 shadow-lg shadow-black/10">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">💡 Pro Tips</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Press <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+Enter</kbd> to submit</li>
          <li>• No need to organize - AI will do it for you</li>
          <li>• Check <strong>Inbox</strong> to see unorganized captures</li>
          <li>• Click <strong>"Organize Now"</strong> in Inbox to process them</li>
        </ul>
      </div>
    </div>
  );
}
