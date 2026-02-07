import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notesAPI } from '../api/client';
import { FileText, X, Plus } from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('');

  const loadNotes = async (tag?: string) => {
    setIsLoading(true);
    try {
      const data = await notesAPI.list(tag);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes(selectedTag || undefined);
  }, [selectedTag]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await notesAPI.delete(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || []))).sort();

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Notes</h2>
          <p className="text-gray-400">{notes.length} notes</p>
        </div>

        <div className="flex items-center gap-3">
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="input-accent px-4 py-2"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          <Link
            to="/notes/new"
            className="btn-accent px-4 py-2 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Note
          </Link>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="sheet-card-inner p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No notes yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first note to get started
          </p>
          <Link to="/notes/new" className="btn-accent px-6 py-3 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="task-card task-card-active group p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
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

                  <Link to={`/notes/${note.id}`}>
                    <h3 className="text-lg font-semibold text-gray-100 mb-2 hover:text-purple-400 transition-colors cursor-pointer">
                      {note.title || 'Untitled'}
                    </h3>
                  </Link>

                  <p className="text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {note.content}
                  </p>

                  <p className="text-gray-500 text-xs mt-3">
                    {new Date(note.date).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400
                           transition-all text-sm px-3 py-1 rounded hover:bg-gray-800"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
