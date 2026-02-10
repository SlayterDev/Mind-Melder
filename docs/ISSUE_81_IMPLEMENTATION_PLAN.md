# Issue #81 Implementation Plan: Show Todos as Task Cards in Chat

## Overview
Enhance the chat interface to display todos as interactive Task Cards when they are created by the AI assistant via tool calls. This provides immediate visual feedback and allows users to interact with newly created todos directly from the chat interface.

## Current State Analysis

### Chat Architecture
The chat system uses Server-Sent Events (SSE) for streaming responses:
- **ChatPage.tsx**: Main chat interface handling message display and streaming
- **ChatMessage.tsx**: Displays individual messages with tool call expansion
- **ChatInput.tsx**: Input component for user messages

### Tool Call Flow
1. User sends a message via ChatInput
2. API endpoint (`/conversations/:id/chat`) processes the message
3. LLM generates response with potential tool calls
4. Tool executor (`ChatToolExecutor`) executes tools (e.g., search_user_content, get_todays_todos)
5. SSE streams back: tokens, tool_call events, tool_result events
6. ChatMessage displays tool calls in collapsible sections

### Current Tool Result Display
Currently, tool results are displayed as plain text strings in the collapsible tool call sections:
```typescript
// From ChatMessage.tsx
{toolResults && toolResults[i] && (
  <div className="mt-2 pt-2 border-t border-gray-700/50">
    <div className="text-xs text-gray-500 mb-1">Result:</div>
    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
      {toolResults[i].result.slice(0, 500)}
      {toolResults[i].result.length > 500 && '...'}
    </pre>
  </div>
)}
```

### Existing TaskCard Component
**Location**: `/apps/web/src/components/TaskCard.tsx`

**Features**:
- Drag-and-drop support (via @dnd-kit)
- Editable content and description
- Due date picker
- Time estimate selector (quick/medium/long)
- Completion toggle
- Feedback system (thumbs up/down with optional text)
- Original capture link
- Priority score and tags display

**Props Interface**:
```typescript
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
    feedbackVote?: FeedbackVote;
    feedbackText?: string;
  };
  onToggleComplete: (id: string, status: string) => void;
  onUpdateDueDate?: (id: string, dueDate: string | null) => void;
  onUpdateDescription?: (id: string, description: string) => void;
  onUpdateContent?: (id: string, content: string) => void;
  onUpdateTimeEstimate?: (id: string, timeEstimate: TimeEstimate) => void;
  onSubmitFeedback?: (id: string, vote: FeedbackVote, feedbackText?: string) => void;
}
```

## Problem Statement

When the AI assistant creates todos (either through organization or other means), users need to:
1. See the created todos immediately in the chat interface
2. Interact with the todos (complete, edit, set due dates) without leaving the chat
3. Have a visual distinction between tool result text and actionable todo items

## Requirements (from Issue #81)

### Requirement 1: Store todo IDs from tool call
- [x] Identify when tool calls create/modify todos
- [x] Extract and store todo IDs from tool results
- [x] Associate todo IDs with specific messages

### Requirement 2: Load and display task in chat UI
- [x] Fetch full todo details by ID
- [x] Render TaskCard components for todos in chat messages
- [x] Handle todo updates from within chat interface

## Implementation Strategy

### Phase 1: Backend - Add `create_todo` Tool (NEW)

**Rationale**: Currently, there's no tool that allows the AI to create todos. The existing tools (`search_user_content`, `get_todays_todos`, `get_recent_captures`) are read-only. We need a tool that can create todos and return the created todo ID.

**Changes Required**:

1. **Add `create_todo` tool definition** (`packages/llm/src/chat-tools/chat-tools.ts`):
```typescript
{
  name: 'create_todo',
  description: `Create a new todo/task for the user. Use this when the user asks you to remind them of something, create a task, or track an action item.`,
  input_schema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The main content/title of the todo'
      },
      description: {
        type: 'string',
        description: 'Optional detailed description of the todo'
      },
      due_date: {
        type: 'string',
        description: 'Optional due date in ISO format (YYYY-MM-DD)'
      },
      time_estimate: {
        type: 'string',
        enum: ['quick', 'medium', 'long', 'none'],
        description: 'Estimated time to complete: quick (<15min), medium (30-60min), long (>90min), none'
      }
    },
    required: ['content']
  }
}
```

2. **Add `create_todo` handler** (`apps/api/src/services/chat-tool-executor.ts`):
```typescript
private async handleCreateTodo(
  userId: string,
  input: CreateTodoInput
): Promise<string> {
  const todo = await this.todoRepository.create({
    userId,
    content: input.content,
    description: input.description,
    dueDate: input.due_date ? new Date(input.due_date) : undefined,
    timeEstimate: input.time_estimate || 'none',
    status: 'pending'
  });
  
  // Return JSON with todo ID for frontend parsing
  return JSON.stringify({
    type: 'todo_created',
    todo_id: todo.id,
    content: todo.content,
    description: todo.description,
    due_date: todo.dueDate?.toISOString(),
    message: `Created todo: ${todo.content}`
  });
}
```

**Why JSON response?**: Returning structured JSON allows the frontend to easily detect todo creation events and extract the ID.

### Phase 2: Backend - Modify Tool Result Streaming

**Current Flow**:
```
SSE Event: data: {"type":"tool_result","name":"search_user_content","result":"...text..."}
```

**New Flow** (detect and enrich todo results):
```typescript
// In /apps/api/src/routes/conversations.ts (chat endpoint)
if (data.type === 'tool_result') {
  let enrichedResult = data.result;
  let todoIds: string[] = [];
  
  // Check if result contains todo creation JSON
  try {
    const parsed = JSON.parse(data.result);
    if (parsed.type === 'todo_created' && parsed.todo_id) {
      todoIds.push(parsed.todo_id);
    }
  } catch {
    // Not JSON, treat as regular text result
  }
  
  // Send enhanced event with todo IDs
  stream.write(`data: ${JSON.stringify({
    type: 'tool_result',
    name: data.name,
    result: enrichedResult,
    todo_ids: todoIds.length > 0 ? todoIds : undefined
  })}\n\n`);
}
```

**Alternative Approach** (simpler): Add a new SSE event type:
```typescript
// When create_todo tool completes
stream.write(`data: ${JSON.stringify({
  type: 'todo_created',
  todo_id: todoId,
  tool_call_id: toolCallId
})}\n\n`);
```

### Phase 3: Frontend - Capture Todo IDs in ChatPage

**Update DisplayMessage Interface**:
```typescript
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ name: string; result: string; todoIds?: string[] }>; // ADD todoIds
  todoIds?: string[]; // Overall todo IDs for the message
  isStreaming?: boolean;
}
```

**Update SSE Parsing** (in `ChatPage.tsx` sendMessage function):
```typescript
// Add to existing event handling
else if (data.type === 'tool_result') {
  const resultData = {
    name: data.name,
    result: data.result,
    todoIds: data.todo_ids // Capture todo IDs if present
  };
  toolResults.push(resultData);
  
  // Aggregate all todo IDs at message level
  const allTodoIds = toolResults
    .flatMap(r => r.todoIds || [])
    .filter(Boolean);
  
  setMessages((prev) => {
    // ... existing update logic ...
    updated[lastIndex] = {
      ...last,
      toolResults: [...toolResults],
      todoIds: allTodoIds.length > 0 ? allTodoIds : undefined
    };
    return updated;
  });
}
// OR handle new todo_created event type
else if (data.type === 'todo_created') {
  // Track todo ID separately
  const todoId = data.todo_id;
  // ... add to message state
}
```

### Phase 4: Frontend - Create ChatTaskCards Component

**New Component**: `/apps/web/src/components/chat/ChatTaskCards.tsx`

**Purpose**: Fetch and display TaskCards for a list of todo IDs in the chat interface.

```typescript
import { useState, useEffect } from 'react';
import { todosAPI } from '../../api/client';
import TaskCard from '../TaskCard';

interface ChatTaskCardsProps {
  todoIds: string[];
  onTodoUpdate?: () => void; // Optional callback for when todos change
}

export function ChatTaskCards({ todoIds, onTodoUpdate }: ChatTaskCardsProps) {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTodos();
  }, [todoIds]);

  const loadTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all todos in parallel
      const todoPromises = todoIds.map(id => todosAPI.get(id));
      const fetchedTodos = await Promise.all(todoPromises);
      setTodos(fetchedTodos);
    } catch (err) {
      console.error('Failed to load todos:', err);
      setError('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (id: string, status: string) => {
    const newStatus = status === 'completed' ? 'pending' : 'completed';
    try {
      if (newStatus === 'completed') {
        await todosAPI.markAsCompleted(id);
      } else {
        await todosAPI.update(id, { status: 'pending' });
      }
      // Refresh todos
      await loadTodos();
      onTodoUpdate?.();
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const handleUpdateDueDate = async (id: string, dueDate: string | null) => {
    try {
      await todosAPI.update(id, { dueDate: dueDate ? new Date(dueDate) : null });
      await loadTodos();
      onTodoUpdate?.();
    } catch (err) {
      console.error('Failed to update due date:', err);
    }
  };

  // Similar handlers for description, content, timeEstimate, feedback...

  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Loading todos...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>;
  }

  if (todos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-3">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
        Created Todos
      </div>
      {todos.map(todo => (
        <TaskCard
          key={todo.id}
          todo={todo}
          onToggleComplete={handleToggleComplete}
          onUpdateDueDate={handleUpdateDueDate}
          onUpdateDescription={handleUpdateDescription}
          onUpdateContent={handleUpdateContent}
          onUpdateTimeEstimate={handleUpdateTimeEstimate}
          onSubmitFeedback={handleSubmitFeedback}
        />
      ))}
    </div>
  );
}
```

**Note on TaskCard Compatibility**:
- TaskCard uses `useSortable` from @dnd-kit for drag-and-drop
- In chat context, we don't need drag-and-drop
- Options:
  1. Make drag-and-drop optional in TaskCard (check if sortable context exists)
  2. Create a simplified ChatTaskCard variant
  3. Wrap in a DndContext provider (unnecessary overhead)

**Recommendation**: Option 1 - Make TaskCard handle missing sortable context gracefully.

### Phase 5: Frontend - Integrate ChatTaskCards into ChatMessage

**Modify ChatMessage.tsx**:

```typescript
import { ChatTaskCards } from './ChatTaskCards';

interface ChatMessageProps {
  // ... existing props
  todoIds?: string[]; // ADD: Array of todo IDs to display
}

export function ChatMessage({ 
  role, 
  content, 
  toolCalls, 
  toolResults, 
  todoIds, // ADD
  isStreaming 
}: ChatMessageProps) {
  // ... existing code ...

  if (role === 'assistant') {
    return (
      <div className="flex flex-col gap-2">
        {/* Existing tool calls section */}
        {toolCalls && toolCalls.length > 0 && (
          // ... existing tool display code ...
        )}

        {/* Message content */}
        {content && (
          <div className="chat-message-assistant">
            <Markdown>{content}</Markdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-accent/70 animate-pulse ml-0.5" />
            )}
          </div>
        )}

        {/* NEW: Display task cards if todos were created */}
        {todoIds && todoIds.length > 0 && (
          <ChatTaskCards todoIds={todoIds} />
        )}
      </div>
    );
  }

  return null;
}
```

### Phase 6: Update TaskCard for Chat Context

**Make Drag-and-Drop Optional**:

```typescript
// In TaskCard.tsx
export default function TaskCard({ todo, onToggleComplete, ... }: TaskCardProps) {
  // Try to use sortable, but don't fail if context is missing
  const sortable = useSortable({ id: todo.id });
  const isDraggable = sortable && sortable.attributes;
  
  const style = isDraggable ? {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  } : {};

  return (
    <div
      ref={isDraggable ? sortable.setNodeRef : undefined}
      style={style}
      className={`task-card ${isDraggable && sortable.isDragging ? 'opacity-50' : ''}`}
    >
      {/* Only show drag handle if draggable */}
      {isDraggable && (
        <div {...sortable.attributes} {...sortable.listeners}>
          <GripVertical size={18} className="text-gray-500" />
        </div>
      )}
      
      {/* Rest of the component */}
    </div>
  );
}
```

**Alternative**: Create a simpler `ChatTaskCard` that doesn't include drag-and-drop at all.

## Technical Considerations

### 1. Tool Result Format
**Decision**: Return JSON from `create_todo` tool with structured data including todo ID.
**Rationale**: 
- Easy to parse on frontend
- Extensible for future metadata
- Clear distinction between regular text results and todo creation

### 2. SSE Event Structure
**Option A**: Enhance existing `tool_result` event with `todo_ids` field
**Option B**: Add new `todo_created` event type

**Recommendation**: Option A (enhance existing event)
- Simpler mental model
- Backward compatible (frontend can ignore missing field)
- Groups todo IDs with the tool that created them

### 3. TaskCard Reusability
**Challenge**: TaskCard is designed for drag-and-drop context (Today Sheet)
**Options**:
1. Make drag-and-drop optional (conditional rendering)
2. Create separate ChatTaskCard component
3. Extract shared logic to base component

**Recommendation**: Option 1
- Maintains single source of truth
- Reduces code duplication
- TaskCard already has many features (editing, feedback) we want in chat

### 4. Todo Fetching Strategy
**Current**: Fetch todos by ID when displaying ChatTaskCards
**Alternative**: Include full todo data in tool result

**Recommendation**: Fetch by ID
- Ensures fresh data (if user updates todo elsewhere)
- Smaller SSE payload
- Consistent with rest of app architecture

### 5. Performance Considerations
- **Parallel fetching**: Use `Promise.all()` to fetch multiple todos concurrently
- **Caching**: Consider using TanStack Query for todo fetching (if already used elsewhere)
- **Lazy loading**: Only fetch todos when message is visible (intersection observer)

### 6. Error Handling
- **Todo not found**: Display error message in card slot
- **Network error**: Show retry button
- **Partial failures**: Display successful todos, show error for failed ones

## Testing Strategy

### Unit Tests
1. **ChatToolExecutor.test.ts**:
   - Test `create_todo` tool handler
   - Verify JSON response format
   - Test error cases (missing content, invalid dates)

2. **ChatTaskCards.test.tsx**:
   - Test loading state
   - Test error state
   - Test successful todo rendering
   - Test todo interactions (complete, edit, feedback)

### Integration Tests
1. **Chat Flow**:
   - Send message asking to create todo
   - Verify SSE stream includes todo_created event
   - Verify TodoCard renders with correct data
   - Verify todo updates reflect in card

2. **Cross-page Consistency**:
   - Create todo in chat
   - Navigate to /todos page
   - Verify todo appears in list

### Manual Testing Scenarios
1. **Basic Creation**:
   - "Remind me to call John tomorrow at 2pm"
   - Verify TaskCard appears with due date and time estimate

2. **Multiple Todos**:
   - "Create tasks: 1) Review PR, 2) Update docs, 3) Deploy to staging"
   - Verify multiple TaskCards appear

3. **Todo Interactions**:
   - Complete todo from chat
   - Edit description
   - Submit feedback
   - Verify updates persist

4. **Edge Cases**:
   - Very long todo content
   - Special characters in content
   - Invalid due dates
   - Network timeout during fetch

## Migration Plan

### Phase 1: Backend (1-2 days)
- [ ] Add `create_todo` tool definition
- [ ] Implement `create_todo` handler in ChatToolExecutor
- [ ] Enhance SSE streaming to include todo IDs
- [ ] Test tool execution manually with curl/Postman

### Phase 2: Frontend - Data Layer (1 day)
- [ ] Update DisplayMessage interface
- [ ] Modify ChatPage SSE parsing to capture todo IDs
- [ ] Test SSE data capture with console logs

### Phase 3: Frontend - UI Components (2 days)
- [ ] Create ChatTaskCards component
- [ ] Integrate ChatTaskCards into ChatMessage
- [ ] Make TaskCard drag-and-drop optional
- [ ] Style TaskCards for chat context (if needed)

### Phase 4: Testing & Refinement (1-2 days)
- [ ] Write unit tests
- [ ] Manual testing across browsers
- [ ] Address edge cases
- [ ] Performance optimization

### Phase 5: Documentation (0.5 day)
- [ ] Update README with new chat feature
- [ ] Add JSDoc comments to new components
- [ ] Update PROJECT_SPEC.md if needed

## Success Criteria

1. **Functional**:
   - ✅ AI can create todos via chat
   - ✅ Created todos appear as TaskCards in chat
   - ✅ Users can interact with todos (complete, edit, feedback) from chat
   - ✅ Todo updates persist to database
   - ✅ Cross-page consistency (todo visible in /todos page)

2. **UX**:
   - ✅ Clear visual distinction between text results and todo cards
   - ✅ Smooth loading states
   - ✅ Graceful error handling
   - ✅ Responsive design

3. **Technical**:
   - ✅ Clean code following existing patterns
   - ✅ No performance regressions
   - ✅ Backward compatible (existing tool results still work)
   - ✅ Test coverage for new code

## Future Enhancements (Out of Scope)

- **Batch operations**: "Complete all todos in this conversation"
- **Todo suggestions**: AI proactively suggests creating todos based on conversation
- **Rich todo preview**: Show original capture link in chat context
- **Todo threading**: Link related todos created in same conversation
- **Undo support**: "Undo creating that todo"
- **Bulk creation UI**: Better handling of multiple todos in single message

## Dependencies

### Required
- None (uses existing TodosRepository, TaskCard, chat infrastructure)

### Optional
- TanStack Query (if implementing caching layer)
- Intersection Observer API (if implementing lazy loading)

## Risks & Mitigation

### Risk 1: TaskCard complexity in chat context
**Mitigation**: Test thoroughly, consider simplified variant if issues arise

### Risk 2: SSE event parsing errors
**Mitigation**: Comprehensive error handling, fallback to text display

### Risk 3: Performance with many todos
**Mitigation**: Implement pagination or lazy loading if needed

### Risk 4: Race conditions (todo created but not yet fetched)
**Mitigation**: Add retry logic, optimistic UI updates

## Appendix

### Related Files
- `/apps/web/src/components/chat/ChatMessage.tsx` - Message display
- `/apps/web/src/pages/ChatPage.tsx` - Chat page with SSE handling
- `/apps/web/src/components/TaskCard.tsx` - Existing task card component
- `/apps/api/src/services/chat-tool-executor.ts` - Tool execution backend
- `/packages/llm/src/chat-tools/chat-tools.ts` - Tool definitions
- `/apps/api/src/routes/conversations.ts` - Chat endpoint with SSE

### API Endpoints Used
- `POST /api/v1/conversations/:id/chat` - Send message (SSE response)
- `GET /api/v1/todos/:id` - Fetch todo by ID
- `PATCH /api/v1/todos/:id` - Update todo
- `PATCH /api/v1/todos/:id/complete` - Mark completed
- `PATCH /api/v1/todos/:id/feedback` - Submit feedback

### Database Schema
```sql
-- todos table (relevant fields)
id UUID PRIMARY KEY
user_id TEXT NOT NULL
content TEXT NOT NULL
description TEXT
status TEXT CHECK (status IN ('pending', 'completed', 'cancelled'))
due_date TIMESTAMP
time_estimate TEXT
feedback_vote TEXT
feedback_text TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

## Summary

This implementation plan provides a clear path to implementing Issue #81's requirements:
1. **Backend**: Add `create_todo` tool and enhance SSE streaming with todo IDs
2. **Frontend**: Capture todo IDs in chat state and display them as TaskCards
3. **Component**: Reuse existing TaskCard with optional drag-and-drop
4. **Testing**: Comprehensive unit and integration tests

The design maintains consistency with existing patterns, reuses components where possible, and provides a foundation for future chat-based todo management features.

**Estimated Effort**: 5-7 days for full implementation and testing
**Complexity**: Medium (requires coordination between backend tools, SSE streaming, and frontend state management)
**Priority**: High (improves user experience and chat utility significantly)
