# Today Sheet Frontend Implementation - Phase 4

**Status**: Ready to implement
**Depends on**: Phase 3 (API endpoints) ✅

## Overview

Build the React frontend for Today Sheet with drag-and-drop task management across four priority sections.

## Key Features

- Generate Today Sheet from captures + todos
- Four draggable sections (Must-Do, Likely, Opportunistic, Overflow)
- Mark tasks complete with checkbox
- Drag tasks within/between sections with visual feedback
- Time estimates and metadata display
- Empty states and loading skeletons

## Implementation Steps

### 1. Install Dependencies

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2. API Client Extension

**File**: `/apps/web/src/api/client.ts`

Add new API methods:
```typescript
export const todaySheetAPI = {
  generate: (templateId?: string) =>
    fetchAPI<{ success: boolean; sheet: TodaySheet }>(
      '/today-sheet/generate',
      { method: 'POST', body: JSON.stringify(templateId ? { templateId } : {}) }
    ),

  get: () => fetchAPI<TodaySheet>('/today-sheet'),

  updateTodo: (id: string, updates: Partial<Todo>) =>
    fetchAPI<Todo>(`/today-sheet/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  reorder: (updates: Array<{ id: string; section: string; order: number }>) =>
    fetchAPI('/today-sheet/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    }),
};
```

### 3. TaskCard Component

**File**: `/apps/web/src/components/TaskCard.tsx` (NEW)

Features:
- Drag handle (⋮⋮ icon)
- Checkbox for completion
- Title with strikethrough when completed
- Metadata chips: time estimate, due date, tags
- Hover effects and transitions

Structure:
```tsx
interface TaskCardProps {
  todo: Todo;
  onToggleComplete: (id: string, status: string) => void;
}

export function TaskCard({ todo, onToggleComplete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: todo.id });

  return (
    <div ref={setNodeRef} style={{ transform, transition }}>
      <button {...attributes} {...listeners}>⋮⋮</button>
      <Checkbox onClick={() => onToggleComplete(todo.id, todo.status)} />
      <div>
        <h3>{todo.content}</h3>
        <MetadataChips todo={todo} />
      </div>
    </div>
  );
}
```

### 4. TodaySheetSection Component

**File**: `/apps/web/src/components/TodaySheetSection.tsx` (NEW)

Features:
- Collapsible sections with toggle
- Section title with item count
- SortableContext for drag-and-drop
- Empty state when no items

Structure:
```tsx
interface SectionProps {
  title: string;
  todos: Todo[];
  onToggleComplete: (id: string, status: string) => void;
}

export function TodaySheetSection({ title, todos, onToggleComplete }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div>
      <button onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>{title} ({todos.length})</h3>
        <span>{isCollapsed ? '▶' : '▼'}</span>
      </button>

      {!isCollapsed && (
        <SortableContext items={todos.map(t => t.id)}>
          {todos.map(todo => (
            <TaskCard key={todo.id} todo={todo} onToggleComplete={onToggleComplete} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}
```

### 5. TodaySheetPage

**File**: `/apps/web/src/pages/TodaySheetPage.tsx` (NEW)

Core logic:
- Load sheet on mount (GET /today-sheet)
- Generate button (POST /today-sheet/generate)
- DndContext for drag-and-drop
- Handle drag end → calculate new positions → optimistic update → API call
- Handle complete toggle → optimistic update → API call
- Loading/empty/error states

Structure:
```tsx
export function TodaySheetPage() {
  const [sheet, setSheet] = useState<TodaySheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadSheet();
  }, []);

  const loadSheet = async () => {
    try {
      const data = await todaySheetAPI.get();
      setSheet(data);
    } catch (error) {
      // Handle 404 (no sheet) vs other errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { sheet: newSheet } = await todaySheetAPI.generate();
      setSheet(newSheet);
    } catch (error) {
      // Error handling
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // 1. Calculate new section and order
    // 2. Optimistic update to sheet state
    // 3. Call API with reorder updates
  };

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    // 1. Optimistic update
    // 2. Call API
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {isLoading ? <LoadingState /> :
       !sheet ? <EmptyState onGenerate={handleGenerate} /> :
       <div>
         <Header summary={sheet.summary} onGenerate={handleGenerate} isGenerating={isGenerating} />
         <TodaySheetSection title="Must-Do Today" todos={sheet.sections.must_do_today} />
         <TodaySheetSection title="Likely Today" todos={sheet.sections.likely_today} />
         <TodaySheetSection title="Opportunistic" todos={sheet.sections.opportunistic} />
         <TodaySheetSection title="Overflow" todos={sheet.sections.overflow} />
       </div>
      }
    </DndContext>
  );
}
```

### 6. Navigation & Routing

**File**: `/apps/web/src/components/Layout.tsx`

Add to navigation:
```tsx
{ path: '/today', label: 'Today Sheet', icon: '📋' }
```

**File**: `/apps/web/src/App.tsx`

Add route:
```tsx
import { TodaySheetPage } from './pages/TodaySheetPage';

<Route path="/today" element={<TodaySheetPage />} />
```

## Files to Create/Modify

**New Files:**
1. `/apps/web/src/pages/TodaySheetPage.tsx` - Main page component
2. `/apps/web/src/components/TaskCard.tsx` - Draggable task card
3. `/apps/web/src/components/TodaySheetSection.tsx` - Collapsible section container

**Modified Files:**
1. `/apps/web/src/api/client.ts` - Add todaySheetAPI methods
2. `/apps/web/src/components/Layout.tsx` - Add navigation link
3. `/apps/web/src/App.tsx` - Add route

## Implementation Order

1. Install @dnd-kit dependencies
2. Extend API client with today-sheet methods
3. Create TaskCard component (static first, then draggable)
4. Create TodaySheetSection component
5. Create TodaySheetPage with loading/empty states
6. Implement generate functionality
7. Implement drag-and-drop with optimistic updates
8. Implement complete toggle
9. Add navigation and routing
10. Polish: loading skeletons, error handling, responsive design

## Key Technical Details

**Drag-and-Drop**:
- Use @dnd-kit/core DndContext wrapper
- Each section is a SortableContext with verticalListSortingStrategy
- Each TaskCard uses useSortable hook
- onDragEnd calculates new section + order, sends PATCH /reorder

**Optimistic Updates**:
- Update local state immediately for snappy UX
- Call API in background
- Revert on error (optional: show toast)

**Time Estimate Display**:
```tsx
const timeEstimateLabels = {
  quick: '⚡ <15min',
  medium: '⏱️ 30-60min',
  long: '⏳ >90min',
  none: '',
};
```

**Due Date Styling**:
- Overdue tasks (dueDate < today && status === 'pending') → red border/text
- Due today → orange/yellow border
- Future/no date → normal gray

## Testing Checklist

- [ ] Generate sheet from captures → verify sections populated
- [ ] Drag task within section → verify order updates
- [ ] Drag task to different section → verify section + order updates
- [ ] Mark task complete → verify checkbox and strikethrough
- [ ] Collapse/expand sections → verify state persists
- [ ] Empty state when no sheet → verify "Generate" button shows
- [ ] Loading state during generation → verify spinner/skeleton
- [ ] Navigate to /today route → verify page loads
- [ ] Mobile responsive → verify drag works on touch devices

## Notes

- Follow existing patterns from CapturePage and TodosPage for consistency
- Use Tailwind CSS classes matching current design system (gray-900 cards, gray-800 borders)
- Keep drag handle subtle but discoverable (⋮⋮ icon, hover opacity change)
- Match checkbox style to existing UI
- Use existing Button/Loading components where applicable
- No real-time updates in MVP (manual refresh or re-generate)
