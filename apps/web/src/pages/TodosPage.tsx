import { useState, useEffect } from 'react';
import { todosAPI, type TimeEstimate } from '../api/client';
import { CheckCircle } from 'lucide-react';
import TodoCard from '../components/TodoCard';

export default function TodosPage() {
  const [todos, setTodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');

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
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setTodos(
      todos.map((t) =>
        t.id === id
          ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? new Date().toISOString() : null }
          : t
      )
    );

    try {
      if (newStatus === 'completed') {
        await todosAPI.markComplete(id);
      } else {
        await todosAPI.update(id, { status: 'pending' });
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
      // Revert on error
      loadTodos(statusFilter === 'all' ? undefined : statusFilter);
    }
  };

  const handleUpdateContent = async (id: string, content: string) => {
    // Optimistic update
    setTodos(todos.map((t) => (t.id === id ? { ...t, content } : t)));

    try {
      await todosAPI.update(id, { content });
    } catch (error) {
      console.error('Failed to update content:', error);
      loadTodos(statusFilter === 'all' ? undefined : statusFilter);
    }
  };

  const handleUpdateDescription = async (id: string, description: string) => {
    // Optimistic update
    setTodos(todos.map((t) => (t.id === id ? { ...t, description } : t)));

    try {
      await todosAPI.update(id, { description });
    } catch (error) {
      console.error('Failed to update description:', error);
      loadTodos(statusFilter === 'all' ? undefined : statusFilter);
    }
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    let isoDate: string | null = null;

    if (dueDate && dueDate.trim()) {
      const [year, month, day] = dueDate.split('-').map(Number);
      const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      isoDate = localDate.toISOString();
    }

    // Optimistic update
    setTodos(todos.map((t) => (t.id === id ? { ...t, dueDate: isoDate || undefined } : t)));

    try {
      await todosAPI.update(id, { dueDate: isoDate });
    } catch (error) {
      console.error('Failed to update due date:', error);
      loadTodos(statusFilter === 'all' ? undefined : statusFilter);
    }
  };

  const handleUpdateTimeEstimate = async (id: string, timeEstimate: TimeEstimate) => {
    // Optimistic update
    setTodos(todos.map((t) => (t.id === id ? { ...t, timeEstimate } : t)));

    try {
      await todosAPI.update(id, { timeEstimate });
    } catch (error) {
      console.error('Failed to update time estimate:', error);
      loadTodos(statusFilter === 'all' ? undefined : statusFilter);
    }
  };

  const handleUpdateTodaySheetSection = async (id: string, section: string) => {
    // Optimistic update
    setTodos(todos.map((t) => (t.id === id ? { ...t, todaySheetSection: section } : t)));

    try {
      await todosAPI.update(id, { todaySheetSection: section });
    } catch (error) {
      console.error('Failed to update today sheet section:', error);
      loadTodos(statusFilter === 'all' ? undefined : statusFilter);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Todos</h2>
          <p className="text-gray-400">
            {pendingCount} pending · {completedCount} completed
          </p>
        </div>

        <div className="flex gap-2 sheet-card p-1">
          {(['pending', 'completed', 'all'] as const).map((filter) => (
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
            <TodoCard
              key={todo.id}
              todo={todo}
              onToggleComplete={handleToggleComplete}
              onUpdateContent={handleUpdateContent}
              onUpdateDescription={handleUpdateDescription}
              onUpdateDueDate={handleUpdateDueDate}
              onUpdateTimeEstimate={handleUpdateTimeEstimate}
              onUpdateTodaySheetSection={handleUpdateTodaySheetSection}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
