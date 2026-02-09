import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { todaySheetAPI, todosAPI } from '../api/client';
import TodaySheetSection from '../components/TodaySheetSection';
import TaskCard from '../components/TaskCard';
import QuickCaptureInput from '../components/QuickCaptureInput';
import TemplateSelector from '../components/TemplateSelector';
import { useInboxCount } from '../api/queries';
import { ClipboardList, Sparkles, Flame, Target, Lightbulb, Package, Loader2, EyeOff, Eye, Check } from 'lucide-react';
import { triggerSmallConfetti, triggerLargeConfetti } from '../utils/confetti';

type TimeEstimate = 'quick' | 'medium' | 'long' | 'none';
type FeedbackVote = 'thumbs_up' | 'thumbs_down' | 'none';

interface Todo {
  id: string;
  content: string;
  status: string;
  todaySheetSection: string;
  todaySheetOrder: number;
  timeEstimate?: TimeEstimate;
  dueDate?: string;
  tags?: string[];
  priorityScore?: number;
  description?: string;
  captureId?: string;
  feedbackVote?: FeedbackVote;
  feedbackText?: string;
}

interface TodaySheet {
  summary: string;
  sections: {
    must_do_today: Todo[];
    likely_today: Todo[];
    opportunistic: Todo[];
    overflow: Todo[];
  };
  totalEstimatedMinutes: number;
  capturesProcessed: number;
  todosIncluded: number;
}

interface CompletionStates {
  isMustDoCompleted: boolean;
  isAllCompleted: boolean;
}

export default function TodaySheetPage() {
  const [sheet, setSheet] = useState<TodaySheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [hideCompleted, setHideCompleted] = useState(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('hideCompletedTasks');
    return stored === 'true';
  });
  const { data: inboxCount = 0 } = useInboxCount();

  // Track previous completion states to detect when completion happens
  const prevMustDoCompletedRef = useRef(false);
  const prevAllCompletedRef = useRef(false);

  const queryClient = useQueryClient();

  // Persist hideCompleted to localStorage
  useEffect(() => {
    localStorage.setItem('hideCompletedTasks', String(hideCompleted));
  }, [hideCompleted]);

  useEffect(() => {
    loadSheet();
  }, []);

  const loadSheet = async () => {
    setIsLoading(true);
    try {
      const data = await todaySheetAPI.get();
      console.log('Today sheet data:', data);
      setSheet(data);
      // Reset confetti tracking when loading a new sheet
      prevMustDoCompletedRef.current = false;
      prevAllCompletedRef.current = false;
    } catch (error: any) {
      if (error.message.includes('404')) {
        setSheet(null);
      } else {
        console.error('Failed to load today sheet:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setShowSuccess(false);
      try {
        const { sheet: newSheet } = await todaySheetAPI.generate(selectedTemplateId);
        setSheet(newSheet);
        // Reset confetti tracking when generating a new sheet
        prevMustDoCompletedRef.current = false;
        prevAllCompletedRef.current = false;
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1000);
      } catch (error) {
        console.error('Failed to generate today sheet:', error);
        alert('Failed to generate today sheet');
      } finally {
        setIsGenerating(false);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['inboxCount'] });
      const previous = queryClient.getQueryData<number>(['inboxCount']);
      queryClient.setQueryData<number>(['inboxCount'], 0);
      return { previous };
    },
    onError: (_err, _newItem, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['inboxCount'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxCount'] });
    },
  });

  // Helper function to check completion states
  const checkCompletionStates = (sheetData: TodaySheet | null): CompletionStates => {
    if (!sheetData) {
      return { isMustDoCompleted: false, isAllCompleted: false };
    }

    const isMustDoCompleted =
      sheetData.sections.must_do_today.length > 0 &&
      sheetData.sections.must_do_today.every((t) => t.status === 'completed');

    // Check other sections (excluding must_do_today which we already checked)
    const otherSectionsCompleted = ['likely_today', 'opportunistic', 'overflow'].every((sectionKey) => {
      const section = sheetData.sections[sectionKey as keyof typeof sheetData.sections];
      return section.length === 0 || section.every((t) => t.status === 'completed');
    });

    // All sections complete if: (must_do_today is complete OR empty) AND other sections complete
    const isAllCompleted =
      (isMustDoCompleted || sheetData.sections.must_do_today.length === 0) && otherSectionsCompleted;

    return { isMustDoCompleted, isAllCompleted };
  };

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    if (sheet) {
      // Capture completion state BEFORE mutation (shallow copy shares sections reference)
      const beforeStates = newStatus === 'completed' ? checkCompletionStates(sheet) : null;

      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, status: newStatus } : t
        );
      });
      setSheet(updatedSheet);

      // Trigger confetti when completing (not when uncompleting)
      if (newStatus === 'completed' && beforeStates) {
        const afterStates = checkCompletionStates(updatedSheet);

        // Check if we just completed the entire today sheet
        if (afterStates.isAllCompleted && !beforeStates.isAllCompleted && !prevAllCompletedRef.current) {
          triggerLargeConfetti();
          prevAllCompletedRef.current = true;
          // Also mark must-do as completed to avoid double confetti
          prevMustDoCompletedRef.current = true;
        }
        // Check if we just completed all must-do tasks (but not the entire sheet)
        else if (afterStates.isMustDoCompleted && !beforeStates.isMustDoCompleted && !prevMustDoCompletedRef.current) {
          triggerSmallConfetti();
          prevMustDoCompletedRef.current = true;
        }
      } else {
        // Reset flags when uncompleting
        prevMustDoCompletedRef.current = false;
        prevAllCompletedRef.current = false;
      }
    }

    // API call
    try {
      await todaySheetAPI.updateTodo(id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update todo:', error);
      // Revert on error
      loadSheet();
    }
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    // Optimistic update
    if (sheet) {
      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, dueDate: dueDate || undefined } : t
        );
      });
      setSheet(updatedSheet);
    }

    // API call
    try {
      // Convert date string to midnight in local timezone, then to ISO string
      let isoDate: string | null = null;
      if (dueDate) {
        const [year, month, day] = dueDate.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        isoDate = localDate.toISOString();
      }
      await todaySheetAPI.updateTodo(id, { dueDate: isoDate });
    } catch (error) {
      console.error('Failed to update due date:', error);
      // Revert on error
      loadSheet();
    }
  };

  const handleUpdateDescription = async (id: string, description: string) => {
    // Optimistic update
    if (sheet) {
      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, description } : t
        );
      });
      setSheet(updatedSheet);
    }

    // API call
    try {
      await todaySheetAPI.updateTodo(id, { description });
    } catch (error) {
      console.error('Failed to update description:', error);
      // Revert on error
      loadSheet();
    }
  };

  const handleUpdateContent = async (id: string, content: string) => {
    // Optimistic update
    if (sheet) {
      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, content } : t
        );
      });
      setSheet(updatedSheet);
    }

    // API call
    try {
      await todaySheetAPI.updateTodo(id, { content });
    } catch (error) {
      console.error('Failed to update content:', error);
      // Revert on error
      loadSheet();
    }
  };

  const handleUpdateTimeEstimate = async (id: string, timeEstimate: TimeEstimate) => {
    // Optimistic update
    if (sheet) {
      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, timeEstimate } : t
        );
      });
      setSheet(updatedSheet);
    }

    // API call
    try {
      await todaySheetAPI.updateTodo(id, { timeEstimate });
    } catch (error) {
      console.error('Failed to update time estimate:', error);
      // Revert on error
      loadSheet();
    }
  };

  const handleSubmitFeedback = async (id: string, vote: FeedbackVote, feedbackText?: string) => {
    // Optimistic update
    if (sheet) {
      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, feedbackVote: vote, feedbackText: vote === 'none' ? undefined : feedbackText } : t
        );
      });
      setSheet(updatedSheet);
    }

    // API call
    try {
      await todosAPI.submitFeedback(id, { vote, feedbackText });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Revert on error
      loadSheet();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !sheet) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find active todo and its current section
    type SectionKey = keyof typeof sheet.sections;
    let activeSection: SectionKey | null = null;
    let activeTodo: Todo | null = null;

    (Object.entries(sheet.sections) as [SectionKey, Todo[]][]).forEach(([sectionKey, todos]) => {
      const found = todos.find((t) => t.id === activeId);
      if (found) {
        activeSection = sectionKey;
        activeTodo = found;
      }
    });

    if (!activeTodo || !activeSection) return;

    // Determine target section
    let targetSection: SectionKey = activeSection;
    const sectionIds: SectionKey[] = ['must_do_today', 'likely_today', 'opportunistic', 'overflow'];

    // Check if dropped on a section (not on a specific todo)
    if (sectionIds.includes(overId as SectionKey)) {
      targetSection = overId as SectionKey;
    } else {
      // Dropped on another todo - find which section that todo is in
      (Object.entries(sheet.sections) as [SectionKey, Todo[]][]).forEach(([sectionKey, todos]) => {
        if (todos.find((t) => t.id === overId)) {
          targetSection = sectionKey;
        }
      });
    }

    // Build new sections
    const newSections = { ...sheet.sections };

    // Remove from old section
    const sourceSectionKey = activeSection as keyof typeof newSections;
    newSections[sourceSectionKey] = newSections[sourceSectionKey].filter((t) => t.id !== activeId);

    // Add to new section
    const targetSectionKey = targetSection as keyof typeof newSections;
    const targetTodos = [...newSections[targetSectionKey]];

    if (activeSection === targetSection) {
      // Reordering within same section
      const newIndex = targetTodos.findIndex((t) => t.id === overId);
      if (newIndex !== -1) {
        targetTodos.splice(newIndex, 0, activeTodo);
      } else {
        targetTodos.push(activeTodo);
      }
    } else {
      // Moving to different section
      const overIndex = targetTodos.findIndex((t) => t.id === overId);
      if (overIndex !== -1) {
        targetTodos.splice(overIndex, 0, activeTodo);
      } else {
        targetTodos.push(activeTodo);
      }
    }

    newSections[targetSectionKey] = targetTodos;

    // Optimistic update
    setSheet({ ...sheet, sections: newSections });

    // Build reorder updates
    const updates: Array<{ id: string; section: string; order: number }> = [];
    Object.entries(newSections).forEach(([section, todos]) => {
      todos.forEach((todo, index) => {
        updates.push({ id: todo.id, section, order: index });
      });
    });

    // API call
    try {
      await todaySheetAPI.reorder(updates);
    } catch (error) {
      console.error('Failed to reorder:', error);
      // Revert on error
      loadSheet();
    }
  };

  const getActiveTodo = (): Todo | null => {
    if (!activeId || !sheet) return null;

    for (const todos of Object.values(sheet.sections)) {
      const found = todos.find((t) => t.id === activeId);
      if (found) return found;
    }
    return null;
  };

  // Helper to filter todos based on hideCompleted setting
  const filterTodos = (todos: Todo[]): Todo[] => {
    if (!hideCompleted) return todos;
    return todos.filter((t) => t.status !== 'completed');
  };

  if (isLoading) {
    return (
      <div className="text-gray-400 text-center py-12">
        <ClipboardList className="w-12 h-12 mx-auto mb-4" />
        <div>Loading today's sheet...</div>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      {/* Quick Capture */}
      <div className="mb-8">
        <QuickCaptureInput variant="input" placeholder="Quick capture..." autoFocus />
      </div>

      {/* Card wrapper for Today's Plan and content */}
      <div className="sheet-card p-4 md:p-8 -mx-4 md:-mx-[50px]">
        {/* Journal Page Header */}
        <div className={`mb-6 pb-4 section-divider ${isGenerating ? 'section-divider-generating' : ''}`}>
          <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-4">
            <div className="flex-1 flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-1">Today's Plan</h1>
              <p className="text-gray-400 text-sm font-serif italic">{dateStr}</p>
              <div className="mt-2 flex items-center gap-2 inset-x-0 bottom-0">
                <button 
                  id="hideCompleted" 
                  className={`checkbox-accent ${
                    hideCompleted ? 'checkbox-setting-accent-checked' : 'checkbox-accent-unchecked'
                  }`}
                  onClick={() => setHideCompleted(!hideCompleted)} 
                >
                  {hideCompleted && <Check className="w-3 h-3 text-white" />}
                </button>
                <label htmlFor="hideCompleted" className="flex items-center gap-2 text-sm font-medium text-gray-300 transition-all cursor-pointer" title="Hide completed tasks">
                    Hide Completed
                </label>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => handleGenerate.mutateAsync()}
                disabled={isGenerating}
                className={`btn-accent flex items-center justify-center gap-2 transition-all ${
                  isGenerating ? 'btn-generating' : ''
                } ${showSuccess ? 'btn-success-flash' : ''}`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : sheet ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Plan
                  </>
                )}
              </button>
              <TemplateSelector
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
              />
              {inboxCount > 0 && (
                <div className="mt-2 text-sm text-gray-400 italic text-right pr-1">
                  <span className="text-accent-highlight">{inboxCount}</span> items unorganized
                </div>
              )}
            </div>
          </div>
        </div>

        {!sheet ? (
          /* Empty State */
          <div className="sheet-card-inner p-6 md:p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-100 mb-2">No Today Sheet Yet</h3>
            <p className="text-gray-400 mb-6">
              Generate your daily plan from captures and todos using AI prioritization.
            </p>
            <button
              onClick={() => handleGenerate.mutateAsync()}
              disabled={isGenerating}
              className="btn-accent-lg flex items-center gap-2 mx-auto"
            >
              {isGenerating ? (
                'Generating...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Today Sheet
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Summary */}
            {sheet.summary && (
              <div className="mb-6 summary-box">
                <p className="text-gray-200 italic font-serif leading-relaxed">{sheet.summary}</p>
              </div>
            )}

            {/* Stats */}
            <div className="mb-6 flex gap-4 text-sm">
              <span className="text-gray-400">
                <span className="text-accent-highlight">{sheet.capturesProcessed}</span> captures
                processed
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">
                <span className="text-accent-highlight">{sheet.totalEstimatedMinutes}</span> min
                estimated
              </span>
            </div>

            {/* Sections with Drag-and-Drop */}
            <DndContext
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-6">
                <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
                  <TodaySheetSection
                    id="must_do_today"
                    title="Must-Do Today"
                    icon={Flame}
                    todos={filterTodos(sheet.sections.must_do_today)}
                    onToggleComplete={handleToggleComplete}
                    onUpdateDueDate={handleUpdateDueDate}
                    onUpdateDescription={handleUpdateDescription}
                    onUpdateContent={handleUpdateContent}
                    onUpdateTimeEstimate={handleUpdateTimeEstimate}
                    onSubmitFeedback={handleSubmitFeedback}
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
                  <TodaySheetSection
                    id="likely_today"
                    title="Likely Today"
                    icon={Target}
                    todos={filterTodos(sheet.sections.likely_today)}
                    onToggleComplete={handleToggleComplete}
                    onUpdateDueDate={handleUpdateDueDate}
                    onUpdateDescription={handleUpdateDescription}
                    onUpdateContent={handleUpdateContent}
                    onUpdateTimeEstimate={handleUpdateTimeEstimate}
                    onSubmitFeedback={handleSubmitFeedback}
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                  <TodaySheetSection
                    id="opportunistic"
                    title="Opportunistic"
                    icon={Lightbulb}
                    todos={filterTodos(sheet.sections.opportunistic)}
                    onToggleComplete={handleToggleComplete}
                    onUpdateDueDate={handleUpdateDueDate}
                    onUpdateDescription={handleUpdateDescription}
                    onUpdateContent={handleUpdateContent}
                    onUpdateTimeEstimate={handleUpdateTimeEstimate}
                    onSubmitFeedback={handleSubmitFeedback}
                  />
                </div>
                <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
                  <TodaySheetSection
                    id="overflow"
                    title="Overflow"
                    icon={Package}
                    todos={filterTodos(sheet.sections.overflow)}
                    onToggleComplete={handleToggleComplete}
                    onUpdateDueDate={handleUpdateDueDate}
                    onUpdateDescription={handleUpdateDescription}
                    onUpdateContent={handleUpdateContent}
                    onUpdateTimeEstimate={handleUpdateTimeEstimate}
                    onSubmitFeedback={handleSubmitFeedback}
                  />
                </div>
              </div>

              <DragOverlay>
                {activeId && getActiveTodo() ? (
                  <div className="opacity-80">
                    <TaskCard todo={getActiveTodo()!} onToggleComplete={() => {}} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}
