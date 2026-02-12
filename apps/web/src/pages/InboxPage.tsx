import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { capturesAPI, organizeAPI } from '../api/client';
import { Zap, MailOpen, X, Pencil, Save, Loader2 } from 'lucide-react';
import TemplateSelector from '../components/TemplateSelector';

// Define Capture type for better type safety
interface Capture {
  id: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export default function InboxPage() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

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
      const result = await organizeAPI.trigger(selectedTemplateId);
      setMessage(result.message);
      await loadCaptures(); // Reload to show empty inbox
      // Invalidate inbox count query
      queryClient.invalidateQueries({ queryKey: ['inboxCount'] });
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Organization failed'}`);
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update - remove from UI immediately
    const previousCaptures = captures;
    setCaptures((prev) => prev.filter((c) => c.id !== id));

    try {
      await capturesAPI.delete(id);
      // Invalidate inbox count query to update other components
      queryClient.invalidateQueries({ queryKey: ['inboxCount'] });
    } catch (error) {
      console.error('Failed to delete capture:', error);
      // Revert on error
      setCaptures(previousCaptures);
    }
  };

  const handleStartEdit = (capture: Capture) => {
    setEditingId(capture.id);
    setEditedContent(capture.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedContent('');
  };

  const handleSaveEdit = async (id: string) => {
    setIsSaving(true);
    const previousCaptures = captures;
    
    try {
      const updatedCapture = await capturesAPI.update(id, { content: editedContent });
      // Update local state after successful API call with server-provided timestamp
      setCaptures((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...(updatedCapture as Record<string, unknown>) } : c))
      );
      setEditingId(null);
      setEditedContent('');
    } catch (error) {
      console.error('Failed to update capture:', error);
      // Revert on error
      setCaptures(previousCaptures);
      setEditingId(id);
    } finally {
      setIsSaving(false);
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
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleOrganize}
              disabled={isOrganizing}
              className="btn-accent-lg flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              {isOrganizing ? 'Organizing...' : 'Organize Now'}
            </button>
            <TemplateSelector
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
            />
          </div>
        )}
      </div>

      {message && (
        <div className="mb-6 bg-green-900/20 border border-green-700/50 rounded-lg p-4 shadow-lg shadow-black/10">
          <p className="text-green-400">{message}</p>
        </div>
      )}

      {captures.length === 0 ? (
        <div className="sheet-card-inner p-12 text-center">
          <MailOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
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
                  {editingId === capture.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 font-mono leading-relaxed focus:outline-none focus:border-accent-highlight resize-y min-h-[60px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            handleSaveEdit(capture.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(capture.id)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white text-xs rounded transition-colors"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-gray-200 text-xs rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                        <span className="text-xs text-gray-500 self-center ml-2">
                          Ctrl+Enter to save, Esc to cancel
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group/content">
                      <p className="text-gray-100 font-mono text-sm leading-relaxed pr-16">
                        {capture.content}
                      </p>
                      <button
                        onClick={() => handleStartEdit(capture)}
                        className="absolute top-0 right-8 opacity-0 group-hover/content:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                        title="Edit capture"
                        aria-label="Edit capture"
                      >
                        <Pencil className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(capture.timestamp).toLocaleString()}
                  </p>
                </div>

                {editingId !== capture.id && (
                  <button
                    onClick={() => handleDelete(capture.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400
                             transition-all text-sm px-3 py-1 rounded hover:bg-gray-800"
                    title="Delete"
                    aria-label="Delete capture"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
