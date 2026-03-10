import { useEffect, useState } from 'react';
import { Transforms } from 'slate';
import { useSlateStatic } from 'slate-react';
import { todosAPI } from '../../api/client';
import type { TaskCardElement } from './types';

interface Props {
  attributes: Record<string, unknown>;
  element: TaskCardElement;
  children: React.ReactNode;
}

interface Todo {
  id: string;
  content: string;
  status: string;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
}

export function TaskCardVoid({ attributes, element, children }: Props) {
  const editor = useSlateStatic();
  const [todo, setTodo] = useState<Todo | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    todosAPI
      .get(element.todoId)
      .then((t: Todo) => setTodo(t))
      .catch(() => setNotFound(true));
  }, [element.todoId]);

  function handleRemove() {
    Transforms.removeNodes(editor, {
      match: (n) =>
        !('text' in n) && 'type' in n && (n as TaskCardElement).type === 'task-card' &&
        (n as TaskCardElement).todoId === element.todoId,
    });
  }

  return (
    <div
      {...(attributes as React.HTMLAttributes<HTMLDivElement>)}
      contentEditable={false}
      className="relative my-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 select-none"
    >
      {notFound ? (
        <p className="text-gray-500 text-sm italic">Todo not found (deleted)</p>
      ) : todo ? (
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 ${
              todo.status === 'completed'
                ? 'border-green-500 bg-green-500'
                : 'border-gray-500'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
              {todo.content}
            </p>
            <div className="flex gap-2 mt-1">
              {todo.dueDate && (
                <span className="text-xs text-gray-400">
                  Due {new Date(todo.dueDate).toLocaleDateString()}
                </span>
              )}
              {todo.estimatedMinutes && (
                <span className="text-xs text-gray-400">{todo.estimatedMinutes}m</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Loading...</p>
      )}
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 text-gray-600 hover:text-gray-300 text-xs leading-none"
        title="Remove task card"
      >
        ✕
      </button>
      {children}
    </div>
  );
}
