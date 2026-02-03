import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notesAPI } from '../api/client';
import { ArrowLeft } from 'lucide-react';

export default function NewNotePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await notesAPI.create({ title: title.trim(), content: content.trim() });
      navigate('/notes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/notes')}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Notes
      </button>

      <h2 className="text-3xl font-bold mb-8">New Note</h2>

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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="btn-accent px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Note'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="px-6 py-3 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
