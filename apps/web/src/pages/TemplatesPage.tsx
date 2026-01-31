import { useState, useEffect } from 'react';
import { templatesAPI } from '../api/client';
import { Settings, Pencil, X } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', prompt: '' });

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await templatesAPI.list();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.prompt.trim()) return;

    try {
      await templatesAPI.create(formData);
      setFormData({ name: '', prompt: '' });
      setIsCreating(false);
      await loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim() || !formData.prompt.trim()) return;

    try {
      await templatesAPI.update(id, formData);
      setEditingId(null);
      setFormData({ name: '', prompt: '' });
      await loadTemplates();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      // Optimistically update UI: deactivate all others, activate this one
      setTemplates(templates.map((t) => ({ ...t, isActive: t.id === id })));

      // API call will handle deactivating others
      await templatesAPI.update(id, { isActive: true });
    } catch (error) {
      console.error('Failed to activate template:', error);
      // Revert on error
      await loadTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;

    try {
      await templatesAPI.delete(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const startEdit = (template: any) => {
    setEditingId(template.id);
    setFormData({ name: template.name, prompt: template.prompt });
    setIsCreating(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: '', prompt: '' });
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Templates</h2>
          <p className="text-gray-400">{templates.length} templates</p>
        </div>

        {!isCreating && !editingId && (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-accent-lg"
          >
            + New Template
          </button>
        )}
      </div>

      {(isCreating || editingId) && (
        <div className="mb-6 sheet-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {isCreating ? 'Create Template' : 'Edit Template'}
          </h3>

          <form
            onSubmit={
              isCreating ? handleCreate : (e) => {
                e.preventDefault();
                if (editingId) handleUpdate(editingId);
              }
            }
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Daily Review, Weekly Summary"
                className="input-accent w-full shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Prompt
              </label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="Describe how the AI should organize notes. E.g., 'Group by Work, Personal, Ideas. Extract todos with due dates.'"
                className="input-accent w-full shadow-inner resize-none"
                rows={4}
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-accent px-6 py-2"
              >
                {isCreating ? 'Create' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg
                         transition-colors border border-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="sheet-card-inner p-12 text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No templates yet</h3>
          <p className="text-gray-500">Create a template to define how AI should organize your notes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="task-card task-card-active group p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-100 mb-2">{template.name}</h3>

                  <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                    {template.prompt}
                  </p>

                  <p className="text-gray-600 text-xs mt-3">
                    Created {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Radio button for active selection */}
                  <button
                    onClick={() => handleSetActive(template.id)}
                    className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-800 transition-colors"
                    title="Set as active template"
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      template.isActive
                        ? 'border-accent bg-accent'
                        : 'border-gray-500 hover:border-accent'
                    }`}>
                      {template.isActive && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className={`text-sm ${template.isActive ? 'text-accent' : 'text-gray-500'}`}>
                      {template.isActive ? 'Active' : 'Set Active'}
                    </span>
                  </button>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => startEdit(template)}
                      className="text-gray-500 hover:text-accent text-sm px-3 py-1 rounded hover:bg-gray-800"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-gray-500 hover:text-red-400 text-sm px-3 py-1 rounded hover:bg-gray-800"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
