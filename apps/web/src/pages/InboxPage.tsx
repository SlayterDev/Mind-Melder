import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { capturesAPI, organizeAPI } from '../api/client';
import { Zap, MailOpen, Inbox } from 'lucide-react';
import TemplateSelector from '../components/TemplateSelector';
import CaptureCard from '../components/CaptureCard';

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

  const handleEdit = async (id: string, content: string) => {
    const previousCaptures = captures;
    
    try {
      const updatedCapture = await capturesAPI.update(id, { content });
      // Update local state after successful API call with server-provided timestamp
      setCaptures((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...(updatedCapture as Record<string, unknown>) } : c))
      );
    } catch (error) {
      console.error('Failed to update capture:', error);
      // Revert on error
      setCaptures(previousCaptures);
      throw error; // Re-throw to let CaptureCard handle the UI state
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

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Inbox className="w-5 h-5" style={{ color: '#9b8dd4' }} />
            <h2 className="page-title">Inbox</h2>
          </div>
          <p className="page-subtitle">{captures.length} unorganized captures</p>
        </div>

        {captures.length > 0 && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleOrganize}
              disabled={isOrganizing}
              className="btn-accent-lg flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
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
            <CaptureCard
              key={capture.id}
              capture={capture}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
