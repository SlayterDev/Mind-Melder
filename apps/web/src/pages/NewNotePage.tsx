import { useNavigate } from 'react-router-dom';
import { notesAPI } from '../api/client';
import { ArrowLeft } from 'lucide-react';
import NoteForm from '../components/NoteForm';

export default function NewNotePage() {
  const navigate = useNavigate();

  const handleSubmit = async (data: { title: string; content: string; contentFormat: 'markdown' | 'slate_json'; tags?: string[] }) => {
    await notesAPI.create(data);
    navigate('/notes');
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

      <NoteForm
        onSubmit={handleSubmit}
        onCancel={() => navigate('/notes')}
      />
    </div>
  );
}
