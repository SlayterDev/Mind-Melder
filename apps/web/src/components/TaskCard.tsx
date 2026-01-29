import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Zap, Clock, Hourglass, GripVertical, Check } from 'lucide-react';

interface TaskCardProps {
  todo: {
    id: string;
    content: string;
    status: string;
    timeEstimate?: string;
    dueDate?: string;
    tags?: string[];
    priorityScore?: number;
  };
  onToggleComplete: (id: string, status: string) => void;
}

export default function TaskCard({ todo, onToggleComplete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getTimeEstimateDisplay = (estimate: string) => {
    const displays: Record<string, { icon: typeof Zap; label: string }> = {
      quick: { icon: Zap, label: '<15min' },
      medium: { icon: Clock, label: '30-60min' },
      long: { icon: Hourglass, label: '>90min' },
    };
    return displays[estimate];
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status === 'pending';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card group ${isDragging ? 'opacity-50 shadow-2xl' : ''} ${
        todo.status === 'completed' ? 'task-card-completed' : 'task-card-active'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="drag-handle"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(todo.id, todo.status)}
          className={`checkbox-accent ${
            todo.status === 'completed' ? 'checkbox-accent-checked' : 'checkbox-accent-unchecked'
          }`}
          title={todo.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
        >
          {todo.status === 'completed' && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-gray-100 leading-relaxed ${
              todo.status === 'completed' ? 'line-through text-gray-500' : ''
            }`}
          >
            {todo.content}
          </p>

          {/* Metadata Chips */}
          {(todo.timeEstimate || todo.dueDate || (todo.tags && todo.tags.length > 0)) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Time Estimate */}
              {todo.timeEstimate && todo.timeEstimate !== 'none' && getTimeEstimateDisplay(todo.timeEstimate) && (() => {
                const display = getTimeEstimateDisplay(todo.timeEstimate!);
                const Icon = display.icon;
                return (
                  <span className="badge-chip flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {display.label}
                  </span>
                );
              })()}

              {/* Due Date */}
              {todo.dueDate && (
                <span
                  className={`badge-chip ${
                    isOverdue ? 'text-red-400 border-red-900 bg-red-950/30' : ''
                  }`}
                >
                  Due: {new Date(todo.dueDate).toLocaleDateString()}
                </span>
              )}

              {/* Tags */}
              {todo.tags &&
                todo.tags.length > 0 &&
                todo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-blue-900/20 border border-blue-700/40 rounded text-xs text-blue-300/90"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
