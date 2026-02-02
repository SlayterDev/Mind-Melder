import { useState, useEffect } from 'react';
import { templatesAPI, tagsAPI, Tag } from '../api/client';
import { Settings, Pencil, X, Tag as TagIcon, Plus } from 'lucide-react';

export default function TemplatesPage() {
  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', prompt: '' });

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagFormData, setTagFormData] = useState({ name: '', description: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [templatesData, tagsData] = await Promise.all([
        templatesAPI.list(),
        tagsAPI.list(),
      ]);
      setTemplates(templatesData);
      setTags(tagsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Template handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.prompt.trim()) return;

    try {
      await templatesAPI.create(formData);
      setFormData({ name: '', prompt: '' });
      setIsCreating(false);
      await loadData();
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
      await loadData();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      setTemplates(templates.map((t) => ({ ...t, isActive: t.id === id })));
      await templatesAPI.update(id, { isActive: true });
    } catch (error) {
      console.error('Failed to activate template:', error);
      await loadData();
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

  // Tag handlers
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagFormData.name.trim()) return;

    try {
      const newTag = await tagsAPI.create({
        name: tagFormData.name.trim(),
        description: tagFormData.description.trim() || undefined,
      });
      setTags([...tags, newTag]);
      setTagFormData({ name: '', description: '' });
      setIsCreatingTag(false);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async (id: string) => {
    if (!tagFormData.name.trim()) return;

    try {
      const updatedTag = await tagsAPI.update(id, {
        name: tagFormData.name.trim(),
        description: tagFormData.description.trim() || undefined,
      });
      setTags(tags.map((t) => (t.id === id ? updatedTag : t)));
      setEditingTagId(null);
      setTagFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Delete this tag?')) return;

    try {
      await tagsAPI.delete(id);
      setTags(tags.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const startEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagFormData({ name: tag.name, description: tag.description || '' });
    setIsCreatingTag(false);
  };

  const cancelEditTag = () => {
    setEditingTagId(null);
    setIsCreatingTag(false);
    setTagFormData({ name: '', description: '' });
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-10">
      {/* Tags Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TagIcon className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-semibold">Tags</h2>
            <span className="text-gray-500 text-sm">({tags.length})</span>
          </div>

          {!isCreatingTag && !editingTagId && (
            <button
              onClick={() => setIsCreatingTag(true)}
              className="flex items-center gap-1 text-sm text-accent hover:text-accent/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Tag
            </button>
          )}
        </div>

        <p className="text-gray-500 text-sm mb-4">
          Tags help the AI categorize your notes during organization.
        </p>

        {/* Tag create/edit form */}
        {(isCreatingTag || editingTagId) && (
          <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <form
              onSubmit={
                isCreatingTag
                  ? handleCreateTag
                  : (e) => {
                      e.preventDefault();
                      if (editingTagId) handleUpdateTag(editingTagId);
                    }
              }
              className="space-y-3"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={tagFormData.name}
                  onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                  placeholder="Tag name"
                  className="input-accent flex-1 text-sm py-2"
                  maxLength={50}
                  required
                  autoFocus
                />
                <input
                  type="text"
                  value={tagFormData.description}
                  onChange={(e) => setTagFormData({ ...tagFormData, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="input-accent flex-[2] text-sm py-2"
                  maxLength={200}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-accent px-4 py-1.5 text-sm">
                  {isCreatingTag ? 'Create' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditTag}
                  className="px-4 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tags list */}
        {tags.length === 0 && !isCreatingTag ? (
          <div className="text-gray-500 text-sm italic">
            No tags yet. Add tags to help categorize your notes.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group relative inline-flex items-center px-3 py-1.5 bg-gray-800/80 border border-gray-700 rounded-full text-sm hover:border-accent/50 transition-colors cursor-pointer"
                onClick={() => startEditTag(tag)}
              >
                <span className="text-gray-200">{tag.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTag(tag.id);
                  }}
                  className="ml-1.5 text-gray-500 hover:text-red-400 hidden group-hover:inline-flex transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {/* Tooltip for description */}
                {tag.description && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {tag.description}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Templates Section */}
      <section>
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
      </section>
    </div>
  );
}
