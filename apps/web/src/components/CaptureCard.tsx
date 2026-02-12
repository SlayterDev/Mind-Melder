import { useState } from 'react';
import { X, Pencil, Save, Loader2 } from 'lucide-react';

interface Capture {
  id: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface CaptureCardProps {
  capture: Capture;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function CaptureCard({ capture, onEdit, onDelete }: CaptureCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(capture.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedContent(capture.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(capture.content);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await onEdit(capture.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      // Error handling is done by parent
      console.error('Failed to save edit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="task-card task-card-active group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 font-mono leading-relaxed focus:outline-none focus:border-accent-highlight resize-y min-h-[60px]"
                autoFocus
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
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
            <p className="text-gray-100 font-mono text-sm leading-relaxed pr-16">
              {capture.content}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-2">
            {new Date(capture.timestamp).toLocaleString()}
          </p>
        </div>

        {!isEditing && (
          <div className="absolute top-4 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleStartEdit}
              className="px-2 py-1 hover:bg-gray-700 rounded"
              title="Edit capture"
              aria-label="Edit capture"
            >
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
            <button
              onClick={() => onDelete(capture.id)}
              className="text-gray-500 hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-gray-800"
              title="Delete"
              aria-label="Delete capture"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
