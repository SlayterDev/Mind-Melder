import { useState, useEffect } from 'react';
import { todosAPI } from '../api/client';
import { CheckCircle, Check, X, ChevronDown, ChevronRight, Pencil, Save } from 'lucide-react';

export default function TodosPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());
  const [editingDescriptions, setEditingDescriptions] = useState<Map<string, string>>(new Map());
  const [editingContents, setEditingContents] = useState<Map<string, string>>(new Map());
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  // Helper to get date from ISO string without timezone conversion
  const getDateOnly = (isoString: string): Date => {
    // Extract just the date portion (YYYY-MM-DD) and parse as local date
    const datePart = isoString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const toggleExpanded = (todoId: string) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

  const startEditingDescription = (todoId: string, currentDescription: string) => {
    const newEditing = new Map(editingDescriptions);
    newEditing.set(todoId, currentDescription || '');
    setEditingDescriptions(newEditing);
  };

  const cancelEditingDescription = (todoId: string) => {
    const newEditing = new Map(editingDescriptions);
    newEditing.delete(todoId);
    setEditingDescriptions(newEditing);
  };

  const saveDescription = async (todoId: string) => {
    const newDescription = editingDescriptions.get(todoId);
    if (newDescription === undefined) return;

    try {
      await todosAPI.update(todoId, { description: newDescription });
      setTodos(todos.map(t => t.id === todoId ? { ...t, description: newDescription } : t));
      cancelEditingDescription(todoId);
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  const startEditingContent = (todoId: string, currentContent: string) => {
    const newEditing = new Map(editingContents);
    newEditing.set(todoId, currentContent);
    setEditingContents(newEditing);
  };

  const cancelEditingContent = (todoId: string) => {
    const newEditing = new Map(editingContents);
    newEditing.delete(todoId);
    setEditingContents(newEditing);
  };

  const saveContent = async (todoId: string) => {
    const newContent = editingContents.get(todoId);
    if (newContent === undefined) return;

    try {
      await todosAPI.update(todoId, { content: newContent });
      setTodos(todos.map(t => t.id === todoId ? { ...t, content: newContent } : t));
      cancelEditingContent(todoId);
    } catch (error) {
      console.error('Failed to update content:', error);
    }
  };

  const handleUpdateDueDate = async (todoId: string, dueDate: string) => {
    try {
      // Convert date string to midnight in local timezone, then to ISO string
      const [year, month, day] = dueDate.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      const isoDate = localDate.toISOString();

      await todosAPI.update(todoId, { dueDate: isoDate });
      setTodos(todos.map(t => t.id === todoId ? { ...t, dueDate: isoDate } : t));
      setShowDatePicker(null);
    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  };

  const loadTodos = async (status?: 'pending' | 'completed') => {
    setIsLoading(true);
    try {
      const data = await todosAPI.list(status);
      setTodos(data);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodos(statusFilter === 'all' ? undefined : statusFilter);
  }, [statusFilter]);

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'pending') {
        await todosAPI.markComplete(id);
        // Update local state
        setTodos(
          todos.map((t) =>
            t.id === id ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t
          )
        );
      } else {
        await todosAPI.update(id, { status: 'pending' });
        setTodos(todos.map((t) => (t.id === id ? { ...t, status: 'pending', completedAt: null } : t)));
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this todo?')) return;

    try {
      await todosAPI.delete(id);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  if (isLoading) {
    return <div className="text-gray-400 text-center py-12">Loading...</div>;
  }

  const pendingCount = todos.filter((t) => t.status === 'pending').length;
  const completedCount = todos.filter((t) => t.status === 'completed').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Todos</h2>
          <p className="text-gray-400">
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>

        <div className="flex gap-2 sheet-card p-1">
          {(['all', 'pending', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
                statusFilter === filter
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={
                statusFilter === filter
                  ? {
                      backgroundColor: 'rgb(114 97 175 / 0.6)',
                      boxShadow: '0 10px 15px -3px rgb(114 97 175 / 0.3)',
                    }
                  : undefined
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {todos.length === 0 ? (
        <div className="sheet-card-inner p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {statusFilter === 'completed' ? 'No completed todos' : 'No todos yet'}
          </h3>
          <p className="text-gray-500">
            {statusFilter === 'all' || statusFilter === 'pending'
              ? 'Todos will be extracted automatically during organization'
              : 'Complete some todos to see them here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`task-card group ${
                todo.status === 'completed' ? 'task-card-completed' : 'task-card-active'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleComplete(todo.id, todo.status)}
                  className={`checkbox-accent ${
                    todo.status === 'completed'
                      ? 'checkbox-accent-checked'
                      : 'checkbox-accent-unchecked'
                  }`}
                  title={todo.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                >
                  {todo.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                </button>

                <div className="flex-1">
                  {/* Title/Content with edit */}
                  {editingContents.has(todo.id) ? (
                    <div className="space-y-2 mb-3">
                      <input
                        type="text"
                        value={editingContents.get(todo.id)}
                        onChange={(e) => {
                          const newEditing = new Map(editingContents);
                          newEditing.set(todo.id, e.target.value);
                          setEditingContents(newEditing);
                        }}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-accent-highlight"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveContent(todo.id);
                          } else if (e.key === 'Escape') {
                            cancelEditingContent(todo.id);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveContent(todo.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        >
                          <Save className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={() => cancelEditingContent(todo.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group/content mb-2">
                      <p
                        className={`text-gray-100 leading-relaxed pr-8 ${
                          todo.status === 'completed' ? 'line-through text-gray-500' : ''
                        }`}
                      >
                        {todo.content}
                      </p>
                      <button
                        onClick={() => startEditingContent(todo.id, todo.content)}
                        className="absolute top-0 right-0 opacity-0 group-hover/content:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                        title="Edit title"
                      >
                        <Pencil className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  )}

                  {/* Description section */}
                  {todo.description && (
                    <div className="mt-3 border-l-2 border-gray-700 pl-3">
                      <button
                        onClick={() => toggleExpanded(todo.id)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
                      >
                        {expandedTodos.has(todo.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="font-medium">Details</span>
                      </button>
                      {expandedTodos.has(todo.id) && (
                        <div className="mt-2 relative">
                          {editingDescriptions.has(todo.id) ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingDescriptions.get(todo.id)}
                                onChange={(e) => {
                                  const newEditing = new Map(editingDescriptions);
                                  newEditing.set(todo.id, e.target.value);
                                  setEditingDescriptions(newEditing);
                                }}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:border-accent-highlight resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveDescription(todo.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </button>
                                <button
                                  onClick={() => cancelEditingDescription(todo.id)}
                                  className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="group/edit">
                              <p className="text-sm text-gray-300 leading-relaxed pr-8">{todo.description}</p>
                              <button
                                onClick={() => startEditingDescription(todo.id, todo.description)}
                                className="absolute top-0 right-0 opacity-0 group-hover/edit:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                                title="Edit description"
                              >
                                <Pencil className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {/* Due Date with picker */}
                    {todo.dueDate && showDatePicker !== todo.id && (
                      <button
                        onClick={() => setShowDatePicker(todo.id)}
                        className={`badge-chip cursor-pointer hover:opacity-80 transition-opacity ${
                          getDateOnly(todo.dueDate) < getDateOnly(new Date().toISOString()) && todo.status === 'pending'
                            ? 'text-red-400 border-red-900 bg-red-950/30'
                            : ''
                        }`}
                      >
                        Due: {getDateOnly(todo.dueDate).toLocaleDateString()}
                      </button>
                    )}
                    {showDatePicker === todo.id && (
                      <div className="relative">
                        <input
                          type="date"
                          defaultValue={todo.dueDate ? getDateOnly(todo.dueDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateDueDate(todo.id, e.target.value)}
                          onBlur={() => setShowDatePicker(null)}
                          autoFocus
                          className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:border-accent-highlight"
                        />
                      </div>
                    )}
                    {todo.completedAt && (
                      <span>Completed: {getDateOnly(todo.completedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(todo.id)}
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
