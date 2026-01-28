import { useState, useEffect } from 'react';
import { todosAPI } from '../api/client';

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

        <div className="flex gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1 shadow-lg shadow-black/10">
          {(['all', 'pending', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 rounded-md font-medium transition-colors capitalize ${
                statusFilter === filter
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {todos.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center shadow-lg shadow-black/20">
          <div className="text-6xl mb-4">✓</div>
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
              className={`bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-lg shadow-black/10
                       hover:border-gray-700 transition-colors group ${
                         todo.status === 'completed' ? 'opacity-60' : ''
                       }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleComplete(todo.id, todo.status)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    todo.status === 'completed'
                      ? 'bg-green-600 border-green-500 shadow-inner'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  title={todo.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                >
                  {todo.status === 'completed' && <span className="text-white text-xs">✓</span>}
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
                        className={`px-2 py-0.5 bg-gray-800 border border-gray-700 rounded ${
                          new Date(todo.dueDate) < new Date() && todo.status === 'pending'
                            ? 'text-red-400 border-red-900'
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
