import { useState, useEffect } from 'react';
import { capturesAPI, organizeAPI } from '../api/client';

export default function InboxPage() {
  const [captures, setCaptures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [message, setMessage] = useState('');

  const loadCaptures = async () => {
    setIsLoading(true);
    try {
      const data = await capturesAPI.listUnorganized();
      setCaptures(data);
    } catch (error) {
      console.error('Failed to load captures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaptures();
  }, []);

  const handleOrganize = async () => {
    if (captures.length === 0) return;

    setIsOrganizing(true);
    setMessage('');

    try {
      const result = await organizeAPI.trigger();
      setMessage(result.message);
      await loadCaptures(); // Reload to show empty inbox
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Organization failed'}`);
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await capturesAPI.delete(id);
      setCaptures(captures.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete capture:', error);
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Inbox</h2>
          <p className="text-gray-400">{captures.length} unorganized captures</p>
        </div>

        {captures.length > 0 && (
          <button
            onClick={handleOrganize}
            disabled={isOrganizing}
            className="btn-accent-lg"
          >
            {isOrganizing ? '⚡ Organizing...' : '⚡ Organize Now'}
          </button>
        )}
      </div>

      {message && (
        <div className="mb-6 bg-green-900/20 border border-green-700/50 rounded-lg p-4 shadow-lg shadow-black/10">
          <p className="text-green-400">{message}</p>
        </div>
      )}

      {captures.length === 0 ? (
        <div className="sheet-card-inner p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Inbox is empty</h3>
          <p className="text-gray-500">All captures have been organized!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {captures.map((capture) => (
            <div
              key={capture.id}
              className="task-card task-card-active group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-gray-100 font-mono text-sm leading-relaxed">
                    {capture.content}
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(capture.timestamp).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(capture.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400
                           transition-all text-sm px-3 py-1 rounded hover:bg-gray-800"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
