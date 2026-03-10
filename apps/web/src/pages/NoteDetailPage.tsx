import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notesAPI } from '../api/client';
import { ArrowLeft, Edit2, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NoteForm from '../components/NoteForm';
import RefineNoteModal from '../components/RefineNoteModal';
import { SlateEditor } from '../components/editor/SlateEditor';
import { deserializeFromString } from '../components/editor/slateSerializer';

export default function NoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefineModal, setShowRefineModal] = useState(false);

  useEffect(() => {
    loadNote();
  }, [id]);

  const loadNote = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const note = await notesAPI.get(id);
      setNote(note);
    } catch (err) {
      console.error('Failed to load note:', err);
      setError(err instanceof Error ? err.message : 'Failed to load note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: {
    title: string;
    content: string;
    contentFormat: 'markdown' | 'slate_json';
    tags?: string[];
  }) => {
    if (!id) return;

    await notesAPI.update(id, data);
    setNote({ ...note, ...data });
    setIsEditing(false);
  };

  const handleRefineAccept = async (data: { title: string; content: string }) => {
    if (!id) return;

    try {
      // LLM always returns markdown
      await notesAPI.update(id, { ...data, contentFormat: 'markdown' });
      setNote({ ...note, ...data, contentFormat: 'markdown' });
      setShowRefineModal(false);
    } catch (err) {
      console.error('Failed to update note:', err);
      setShowRefineModal(false);
      setError('Failed to apply refined content');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this note?')) return;

    try {
      await notesAPI.delete(id);
      navigate('/notes');
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError('Failed to delete note');
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  if (error || !note) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Note not found'}</p>
        <button
          onClick={() => navigate('/notes')}
          className="btn-accent px-6 py-3"
        >
          Back to Notes
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <button
          onClick={() => setIsEditing(false)}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel Editing
        </button>

        <h2 className="text-3xl font-bold mb-8">Edit Note</h2>

        <NoteForm
          initialTitle={note.title}
          initialContent={note.content}
          initialContentFormat={note.contentFormat ?? 'markdown'}
          initialTags={note.tags || []}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
          submitLabel="Update Note"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notes
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRefineModal(true)}
            className="btn-accent px-4 py-2 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Refine
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="btn-accent px-4 py-2 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-gray-400 hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="max-w-3xl">
        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {note.tags.map((tag: string) => (
              <span
                key={tag}
                className="badge-accent px-3 py-1 shadow-inner text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-4xl font-bold text-gray-100 mb-4">
          {note.title || 'Untitled'}
        </h1>

        <p className="text-gray-500 text-sm mb-8">
          {new Date(note.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {note.contentFormat === 'slate_json' ? (
          <SlateEditor
            value={deserializeFromString(note.content)}
            onChange={() => {}}
            readOnly
          />
        ) : (
          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {showRefineModal && (
        <RefineNoteModal
          note={note}
          onClose={() => setShowRefineModal(false)}
          onAccept={handleRefineAccept}
        />
      )}
    </div>
  );
}
