import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Zap, Clock, Hourglass, GripVertical, Check, ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface TaskCardProps {
  todo: {
    id: string;
    content: string;
    status: string;
    timeEstimate?: string;
    dueDate?: string;
    tags?: string[];
    priorityScore?: number;
    description?: string;
    captureId?: string;
  };
  onToggleComplete: (id: string, status: string) => void;
  onUpdateDueDate?: (id: string, dueDate: string | null) => void;
}

export default function TaskCard({ todo, onToggleComplete, onUpdateDueDate }: TaskCardProps) {
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

  const [showDescription, setShowDescription] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalCapture, setOriginalCapture] = useState<string | null>(null);
  const [isLoadingCapture, setIsLoadingCapture] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchOriginalCapture = async () => {
    if (!todo.captureId || originalCapture) return;
    setIsLoadingCapture(true);
    try {
      const response = await fetch(`http://localhost:3000/api/v1/captures/${todo.captureId}`);
      const capture = await response.json();
      setOriginalCapture(capture.content);
    } catch (error) {
      console.error('Failed to fetch capture:', error);
      setOriginalCapture('Failed to load original capture');
    } finally {
      setIsLoadingCapture(false);
    }
  };

  const toggleOriginal = () => {
    if (!showOriginal && !originalCapture) {
      fetchOriginalCapture();
    }
    setShowOriginal(!showOriginal);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (onUpdateDueDate) {
      onUpdateDueDate(todo.id, newDate || null);
    }
    setShowDatePicker(false);
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
          {/* Main content with optional capture icon */}
          <div className="flex items-start gap-2">
            <p
              className={`flex-1 text-gray-100 leading-relaxed ${
                todo.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}
            >
              {todo.content}
            </p>

            {/* Original capture icon - subtle and on the right */}
            {todo.captureId && (
              <button
                onClick={toggleOriginal}
                className="flex-shrink-0 mt-0.5 opacity-40 hover:opacity-100 transition-opacity"
                title="View original capture"
              >
                <FileText className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Expanded original capture */}
          {showOriginal && todo.captureId && (
            <div className="mt-3 px-3 py-2 bg-gray-900/40 border border-gray-700/50 rounded text-sm text-gray-400 italic">
              {isLoadingCapture ? (
                <span>Loading original capture...</span>
              ) : (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Original capture:</div>
                  <p>{originalCapture}</p>
                </div>
              )}
            </div>
          )}

          {/* Description section */}
          {todo.description && (
            <div className="mt-3 border-l-2 border-gray-700 pl-3">
              <button
                onClick={() => setShowDescription(!showDescription)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
              >
                {showDescription ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="font-medium">Details</span>
              </button>
              {showDescription && (
                <p className="mt-2 text-sm text-gray-300 leading-relaxed">{todo.description}</p>
              )}
            </div>
          )}

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
              {todo.dueDate && !showDatePicker && (
                <button
                  onClick={() => setShowDatePicker(true)}
                  className={`badge-chip cursor-pointer hover:opacity-80 transition-opacity ${
                    isOverdue ? 'text-red-400 border-red-900 bg-red-950/30' : ''
                  }`}
                >
                  Due: {new Date(todo.dueDate).toLocaleDateString()}
                </button>
              )}

              {/* Date Picker */}
              {showDatePicker && (
                <div className="relative">
                  <input
                    type="date"
                    defaultValue={todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : ''}
                    onChange={handleDateChange}
                    onBlur={() => setShowDatePicker(false)}
                    autoFocus
                    className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 focus:outline-none focus:border-accent-highlight"
                  />
                </div>
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
