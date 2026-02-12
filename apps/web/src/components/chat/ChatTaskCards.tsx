import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { todosAPI, type TimeEstimate } from '../../api/client';
import TaskCard from '../TaskCard';

type FeedbackVote = 'thumbs_up' | 'thumbs_down' | 'none';

interface ChatTaskCardsProps {
  todoIds: string[];
}

export function ChatTaskCards({ todoIds }: ChatTaskCardsProps) {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(todoIds.map((id) => todosAPI.get(id)));
      const successfulTodos = results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled' && Boolean(result.value)
        )
        .map((result) => result.value);

      setTodos(successfulTodos);

      const hadFailures = results.some((result) => result.status === 'rejected');
      if (hadFailures) {
        setError('Some todos could not be loaded');
      }
    } catch {
      setError('Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [todoIds]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleToggleComplete = async (id: string, status: string) => {
    try {
      if (status === 'completed') {
        await todosAPI.update(id, { status: 'pending' });
      } else {
        await todosAPI.markComplete(id);
      }
      await loadTodos();
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    try {
      await todosAPI.update(id, { dueDate: dueDate ?? undefined });
      await loadTodos();
    } catch (err) {
      console.error('Failed to update due date:', err);
    }
  };

  const handleUpdateDescription = async (id: string, description: string) => {
    try {
      await todosAPI.update(id, { description });
      await loadTodos();
    } catch (err) {
      console.error('Failed to update description:', err);
    }
  };

  const handleUpdateContent = async (id: string, content: string) => {
    try {
      await todosAPI.update(id, { content });
      await loadTodos();
    } catch (err) {
      console.error('Failed to update content:', err);
    }
  };

  const handleUpdateTimeEstimate = async (id: string, timeEstimate: TimeEstimate) => {
    try {
      await todosAPI.update(id, { timeEstimate });
      await loadTodos();
    } catch (err) {
      console.error('Failed to update time estimate:', err);
    }
  };

  const handleSubmitFeedback = async (id: string, vote: FeedbackVote, feedbackText?: string) => {
    try {
      await todosAPI.submitFeedback(id, { vote, feedbackText });
      await loadTodos();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        {todoIds.map((id) => (
          <div key={id} className="h-16 bg-gray-800/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-400 mt-3">{error}</div>;
  }

  if (todos.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 ml-2 mr-24 space-y-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={() => {}}>
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <TaskCard
              key={todo.id}
              todo={todo}
              showDragHandle={false}
              onToggleComplete={handleToggleComplete}
              onUpdateDueDate={handleUpdateDueDate}
              onUpdateDescription={handleUpdateDescription}
              onUpdateContent={handleUpdateContent}
              onUpdateTimeEstimate={handleUpdateTimeEstimate}
              onSubmitFeedback={handleSubmitFeedback}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
