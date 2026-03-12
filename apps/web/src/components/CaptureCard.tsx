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
                className="input-edit font-mono leading-relaxed resize-y min-h-[60px]"
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
                  className="btn-save"
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
                  className="btn-cancel"
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
              className="icon-btn"
              title="Edit capture"
              aria-label="Edit capture"
            >
              <Pencil className="w-3 h-3 text-gray-400" />
            </button>
            <button
              onClick={() => onDelete(capture.id)}
              className="text-gray-500 hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-white/[0.06]"
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
