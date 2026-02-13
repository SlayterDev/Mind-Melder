import { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import { ChevronRight, ChevronDown, LucideIcon } from 'lucide-react';

type TimeEstimate = 'quick' | 'medium' | 'long' | 'none';
type FeedbackVote = 'thumbs_up' | 'thumbs_down' | 'none';

interface Todo {
  id: string;
  content: string;
  status: string;
  timeEstimate?: string;
  dueDate?: string;
  tags?: string[];
  priorityScore?: number;
  description?: string;
  captureId?: string;
  feedbackVote?: FeedbackVote;
  feedbackText?: string;
}

interface SectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  todos: Todo[];
  onToggleComplete: (id: string, status: string) => void;
  onUpdateDueDate?: (id: string, dueDate: string | null) => void;
  onUpdateDescription?: (id: string, description: string) => void;
  onUpdateContent?: (id: string, content: string) => void;
  onUpdateTimeEstimate?: (id: string, timeEstimate: TimeEstimate) => void;
  onSubmitFeedback?: (id: string, vote: FeedbackVote, feedbackText?: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
}

export default function TodaySheetSection({
  id,
  title,
  icon: Icon,
  todos,
  onToggleComplete,
  onUpdateDueDate,
  onUpdateDescription,
  onUpdateContent,
  onUpdateTimeEstimate,
  onSubmitFeedback,
  onUpdateTags,
}: SectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="mb-6">
      {/* Section Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full mb-4 group"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6" />
          <h3 className="section-header">{title}</h3>
          <span className="badge-accent">{todos.length}</span>
        </div>
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5 text-accent-arrow" />
        ) : (
          <ChevronDown className="w-5 h-5 text-accent-arrow" />
        )}
      </button>

      {/* Section Content */}
      {!isCollapsed && (
        <div ref={setNodeRef} className="space-y-3 pl-2 section-border">
          {todos.length === 0 ? (
            <div className="text-gray-500 text-sm italic py-4 pl-4">No tasks in this section</div>
          ) : (
            <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {todos.map((todo) => (
                <TaskCard
                  key={todo.id}
                  todo={todo}
                  onToggleComplete={onToggleComplete}
                  onUpdateDueDate={onUpdateDueDate}
                  onUpdateDescription={onUpdateDescription}
                  onUpdateContent={onUpdateContent}
                  onUpdateTimeEstimate={onUpdateTimeEstimate}
                  onSubmitFeedback={onSubmitFeedback}
                  onUpdateTags={onUpdateTags}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
