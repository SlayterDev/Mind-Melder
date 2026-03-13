import { useEffect, useRef, useState } from 'react';
import { Transforms } from 'slate';
import { ReactEditor } from 'slate-react';
import type { Editor } from 'slate';
import { todosAPI } from '../../api/client';

interface Todo {
  id: string;
  content: string;
  status: string;
  dueDate?: string | null;
}

interface Props {
  editor: Editor;
  triggerPath: number[];
  onClose: () => void;
}

export function CommandPalette({ editor, triggerPath, onClose }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position palette near the slash character
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    try {
      const domNode = ReactEditor.toDOMNode(editor, editor);
      const rect = domNode.getBoundingClientRect();
      setPosition({ top: rect.top + 24, left: rect.left });
    } catch {
      // use default position
    }
  }, [editor]);

  useEffect(() => {
    todosAPI.list('pending').then((data: Todo[]) => setTodos(data)).catch(() => {});
    inputRef.current?.focus();
  }, []);

  const filtered = todos.filter((t) =>
    t.content.toLowerCase().includes(query.toLowerCase())
  );

  function insertTaskCard(todo: Todo) {
    // Delete the '/' character that triggered the palette
    Transforms.select(editor, { path: triggerPath, offset: 0 });
    Transforms.delete(editor, { unit: 'character' });

    // Insert the task-card void element
    Transforms.insertNodes(editor, {
      type: 'task-card',
      todoId: todo.id,
      children: [{ text: '' }],
    } as import('./types').TaskCardElement);

    // Move cursor past the void
    Transforms.move(editor, { unit: 'offset' });

    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) insertTaskCard(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 50 }}
      className="w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-700">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="Search todos..."
          className="w-full bg-transparent text-gray-200 text-sm outline-none placeholder-gray-500"
        />
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-gray-500 text-sm">No pending todos found</li>
        ) : (
          filtered.map((todo, i) => (
            <li key={todo.id}>
              <button
                onMouseDown={(e) => { e.preventDefault(); insertTaskCard(todo); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  i === activeIndex ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="line-clamp-2">{todo.content}</span>
                {todo.dueDate && (
                  <span className="text-xs text-gray-500 block mt-0.5">
                    Due {new Date(todo.dueDate).toLocaleDateString()}
                  </span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
