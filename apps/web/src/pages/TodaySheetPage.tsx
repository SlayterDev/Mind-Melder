import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { todaySheetAPI } from '../api/client';
import TodaySheetSection from '../components/TodaySheetSection';
import TaskCard from '../components/TaskCard';
import QuickCaptureInput from '../components/QuickCaptureInput';
import { useInboxCount } from '../api/queries';
import { ClipboardList, Sparkles, Flame, Target, Lightbulb, Package } from 'lucide-react';

interface Todo {
  id: string;
  content: string;
  status: string;
  todaySheetSection: string;
  todaySheetOrder: number;
  timeEstimate?: string;
  dueDate?: string;
  tags?: string[];
  priorityScore?: number;
  description?: string;
  captureId?: string;
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

export default function TodaySheetPage() {
  const [sheet, setSheet] = useState<TodaySheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: inboxCount = 0 } = useInboxCount();

  const queryClient = useQueryClient();

  useEffect(() => {
    loadSheet();
  }, []);

  const loadSheet = async () => {
    setIsLoading(true);
    try {
      const data = await todaySheetAPI.get();
      console.log('Today sheet data:', data);
      setSheet(data);
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
      try {
        const { sheet: newSheet } = await todaySheetAPI.generate();
        setSheet(newSheet);
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

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    if (sheet) {
      const updatedSheet = { ...sheet };
      Object.keys(updatedSheet.sections).forEach((sectionKey) => {
        const section = sectionKey as keyof typeof updatedSheet.sections;
        updatedSheet.sections[section] = updatedSheet.sections[section].map((t) =>
          t.id === id ? { ...t, status: newStatus } : t
        );
      });
      setSheet(updatedSheet);
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
    <div className="max-w-4xl mx-auto">
      {/* Quick Capture */}
      <div className="mb-8">
        <QuickCaptureInput variant="input" placeholder="Quick capture..." autoFocus />
      </div>

      {/* Card wrapper for Today's Plan and content */}
      <div className="sheet-card p-8 -mx-[50px]">
        {/* Journal Page Header */}
        <div className="mb-6 pb-4 section-divider">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-1">Today's Plan</h1>
              <p className="text-gray-400 text-sm font-serif italic">{dateStr}</p>
            </div>
            <div className="grid grid-cols-1 justify-end">
              <button
                onClick={() => handleGenerate.mutateAsync()}
                disabled={isGenerating}
                className="btn-accent flex items-center gap-2"
              >
                {isGenerating ? (
                  'Generating...'
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
          <div className="sheet-card-inner p-12 text-center">
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
                <TodaySheetSection
                  id="must_do_today"
                  title="Must-Do Today"
                  icon={Flame}
                  todos={sheet.sections.must_do_today}
                  onToggleComplete={handleToggleComplete}
                  onUpdateDueDate={handleUpdateDueDate}
                />
                <TodaySheetSection
                  id="likely_today"
                  title="Likely Today"
                  icon={Target}
                  todos={sheet.sections.likely_today}
                  onToggleComplete={handleToggleComplete}
                  onUpdateDueDate={handleUpdateDueDate}
                />
                <TodaySheetSection
                  id="opportunistic"
                  title="Opportunistic"
                  icon={Lightbulb}
                  todos={sheet.sections.opportunistic}
                  onToggleComplete={handleToggleComplete}
                  onUpdateDueDate={handleUpdateDueDate}
                />
                <TodaySheetSection
                  id="overflow"
                  title="Overflow"
                  icon={Package}
                  todos={sheet.sections.overflow}
                  onToggleComplete={handleToggleComplete}
                  onUpdateDueDate={handleUpdateDueDate}
                />
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
