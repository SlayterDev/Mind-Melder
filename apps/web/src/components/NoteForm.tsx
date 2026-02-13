import { useState } from 'react';
import TagEditor from './TagEditor';

interface NoteFormProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  onSubmit: (data: { title: string; content: string; tags?: string[] }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export default function NoteForm({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  onSubmit,
  onCancel,
  submitLabel = 'Save Note',
}: NoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        tags: tags.length > 0 ? tags : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="input-accent w-full px-4 py-3"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={12}
          className="input-accent w-full px-4 py-3 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tags <span className="text-gray-500">(press Enter or comma to add)</span>
        </label>
        <TagEditor tags={tags} onChange={setTags} size="md" />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !content.trim()}
          className="btn-accent px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
