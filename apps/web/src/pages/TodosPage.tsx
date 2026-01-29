import { useState, useEffect } from 'react';
import { todosAPI } from '../api/client';
import { CheckCircle, Check, X } from 'lucide-react';

export default function TodosPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

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
                  <p
                    className={`text-gray-100 leading-relaxed ${
                      todo.status === 'completed' ? 'line-through text-gray-500' : ''
                    }`}
                  >
                    {todo.content}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {todo.dueDate && (
                      <span
                        className={`badge-chip ${
                          new Date(todo.dueDate) < new Date() && todo.status === 'pending'
                            ? 'text-red-400 border-red-900 bg-red-950/30'
                            : ''
                        }`}
                      >
                        Due: {new Date(todo.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {todo.completedAt && (
                      <span>Completed: {new Date(todo.completedAt).toLocaleDateString()}</span>
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
