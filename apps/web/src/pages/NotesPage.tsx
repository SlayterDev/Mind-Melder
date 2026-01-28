import { useState, useEffect } from 'react';
import { notesAPI } from '../api/client';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const loadNotes = async (category?: string) => {
    setIsLoading(true);
    try {
      const data = await notesAPI.list(category);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes(selectedCategory || undefined);
  }, [selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await notesAPI.delete(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const categories = Array.from(new Set(notes.map((n) => n.category).filter(Boolean)));

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Organized Notes</h2>
          <p className="text-gray-400">{notes.length} notes</p>
        </div>

        {categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-300
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     shadow-lg shadow-black/10"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center shadow-lg shadow-black/20">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No organized notes yet</h3>
          <p className="text-gray-500">
            Capture some notes and click "Organize Now" in the Inbox
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-gray-900 border border-gray-800 rounded-lg p-5 shadow-lg shadow-black/10
                       hover:border-gray-700 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {note.category && (
                    <span className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-700/30 text-blue-400
                                   text-xs font-medium rounded-full mb-3 shadow-inner">
                      {note.category}
                    </span>
                  )}

                  <p className="text-gray-100 leading-relaxed whitespace-pre-wrap">
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
