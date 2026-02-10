# Issue #81 Implementation Plan: Show Todos as Task Cards in Chat

## Overview
Enhance the chat interface to display todos as interactive Task Cards when they are returned by existing tool calls (e.g., `get_todays_todos`, `search_user_content`). This provides immediate visual feedback and allows users to interact with todos directly from the chat interface without leaving the conversation.

**Scope**: Display up to 2 todos per message as TaskCards. No new tool creation - work with existing tools only.

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

When the AI assistant retrieves todos via existing tools (`get_todays_todos`, `search_user_content`), users currently see them only as plain text. Users need to:
1. See todos as interactive TaskCards in the chat interface
2. Interact with the todos (complete, edit, set due dates) without leaving the chat
3. Have a visual distinction between tool result text and actionable todo items
4. Avoid UI clutter (limit to 2 todos shown per message)

## Requirements (from Issue #81)

### Requirement 1: Store todo IDs from tool call results
- [x] Identify when tool calls return todos (e.g., `get_todays_todos`, `search_user_content`)
- [x] Extract and store todo IDs from tool results
- [x] Associate todo IDs with specific messages
- [x] Limit to 2 todos per message

### Requirement 2: Load and display tasks in chat UI
- [x] Fetch full todo details by ID
- [x] Render TaskCard components for up to 2 todos in chat messages
- [x] Handle todo updates from within chat interface

## Implementation Strategy

### Phase 1: Backend - Enhance Tool Result Format

**Rationale**: Current tools (`get_todays_todos`, `search_user_content`) return todos as plain text strings. We need to include todo IDs in the tool results so the frontend can fetch and display them as TaskCards.

**Changes Required**:

1. **Update tool result format** (`apps/api/src/services/chat-tool-executor.ts`):

Instead of returning only text, return JSON with both text (for display in tool results) and todo IDs:

```typescript
private async handleGetTodaysTodos(
  userId: string,
  input: GetTodaysTodosInput
): Promise<string> {
  const todos = await this.todoRepository.findDueToday(userId, input.include_completed || false);
  if (todos.length === 0) {
    return 'No todos due today.';
  }

  // Build text output (existing)
  let output = 'Today\'s Todos:\n';
  const todoIds: string[] = [];
  
  todos.forEach((todo, index) => {
    const dueDate = todo.dueDate ? (todo.dueDate instanceof Date ? todo.dueDate : new Date(todo.dueDate as string)) : null;
    output += `${index + 1}. (${dueDate ? "Due: " + dueDate.toISOString() : 'No due date'}) ${todo.content} - ${todo.status === 'completed' ? 'Completed' : 'Pending'} - ${todo.description}\n`;
    todoIds.push(todo.id);
  });

  // Return JSON with both text and IDs
  return JSON.stringify({
    type: 'todos_result',
    text: output,
    todo_ids: todoIds.slice(0, 2) // Limit to 2 todos
  });
}
```

Similarly update `handleSearchContent` to include todo IDs when todos are returned:

```typescript
private async handleSearchContent(
  userId: string,
  input: SearchToolInput
): Promise<string> {
  const results = await this.searchService.search(userId, input.query, input.type || 'all');
  
  // ... existing result building code ...
  
  const todoIds: string[] = [];
  if (results.todos) {
    output += `\nTodos:\n`;
    results.todos.slice(0, input.limit || 8).forEach((todo, index) => {
      output += `${index + 1}. (${todo.dueDate ? "Due: " + todo.dueDate?.toISOString() : 'No due date'}) ${todo.content} - ${todo.status === 'completed' ? 'Completed' : 'Pending'}${todo.description ? ' - ' + todo.description : ''}\n`;
      todoIds.push(todo.id);
    });
  }

  // Return JSON if there are todo IDs
  if (todoIds.length > 0) {
    return JSON.stringify({
      type: 'search_result',
      text: output,
      todo_ids: todoIds.slice(0, 2) // Limit to 2 todos
    });
  }
  
  return output; // Plain text if no todos
}
```

**Why JSON response?**: Returning structured JSON allows the frontend to easily detect todo IDs and extract them for TaskCard display.

### Phase 2: Backend - Parse JSON Tool Results in SSE Streaming

**Current Flow**:
```
SSE Event: data: {"type":"tool_result","name":"get_todays_todos","result":"...text..."}
```

**New Flow** (detect and parse JSON results):
```typescript
// In /apps/api/src/routes/conversations.ts (chat endpoint)
// When tool result comes back, check if it's JSON with todo IDs
if (toolResult.name === 'get_todays_todos' || toolResult.name === 'search_user_content') {
  let resultText = toolResult.result;
  let todoIds: string[] | undefined;
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(toolResult.result);
    if (parsed.type && parsed.text && parsed.todo_ids) {
      resultText = parsed.text; // Extract text for display
      todoIds = parsed.todo_ids; // Extract todo IDs
    }
  } catch {
    // Not JSON, treat as regular text result
  }
  
  // Send enhanced event with todo IDs if present
  stream.write(`data: ${JSON.stringify({
    type: 'tool_result',
    name: toolResult.name,
    result: resultText,
    todo_ids: todoIds // Optional field
  })}\n\n`);
}
```

**Backward Compatibility**: Tools that return plain text (not JSON) will work as before. The `todo_ids` field is optional.

### Phase 3: Frontend - Capture Todo IDs in ChatPage

**Update DisplayMessage Interface**:
```typescript
interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ name: string; result: string; todoIds?: string[] }>; // ADD todoIds
  todoIds?: string[]; // Overall todo IDs for the message (max 2)
  isStreaming?: boolean;
}
```

**Update SSE Parsing** (in `ChatPage.tsx` sendMessage function):
```typescript
// Update existing tool_result handler
else if (data.type === 'tool_result') {
  const resultData = {
    name: data.name,
    result: data.result,
    todoIds: data.todo_ids ? data.todo_ids.slice(0, 2) : undefined // LIMIT TO 2
  };
  toolResults.push(resultData);
  
  // Aggregate all todo IDs at message level (max 2 total)
  const allTodoIds = toolResults
    .flatMap(r => r.todoIds || [])
    .filter(Boolean)
    .slice(0, 2); // ENFORCE 2-TODO LIMIT
  
  setMessages((prev) => {
    if (conversationIdRef.current !== currentConversationId) {
      return prev;
    }
    const updated = [...prev];
    const lastIndex = updated.length - 1;
    const last = updated[lastIndex];
    if (last?.role === 'assistant' && last.id === tempAssistantId) {
      updated[lastIndex] = {
        ...last,
        toolResults: [...toolResults],
        todoIds: allTodoIds.length > 0 ? allTodoIds : undefined
      };
    }
    return updated;
  });
}
```

### Phase 4: Frontend - Create ChatTaskCards Component

**New Component**: `/apps/web/src/components/chat/ChatTaskCards.tsx`

**Purpose**: Fetch and display up to 2 TaskCards for a list of todo IDs in the chat interface.

```typescript
import { useState, useEffect } from 'react';
import { todosAPI } from '../../api/client';
import TaskCard from '../TaskCard';

interface ChatTaskCardsProps {
  todoIds: string[]; // Already limited to 2 from backend
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
      // todoIds are already limited to 2, fetch all in parallel
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
        Todos ({todos.length})
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

**Note**: Since todoIds are already limited to 2 from the backend, no additional limiting is needed in this component.

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
**Decision**: Return JSON from existing tools (`get_todays_todos`, `search_user_content`) when todos are present, with structured data including todo IDs.
**Rationale**: 
- Easy to parse on frontend
- Backward compatible (tools can still return plain text)
- Clear way to pass todo IDs without breaking existing text display

### 2. SSE Event Structure
**Decision**: Enhance existing `tool_result` event with optional `todo_ids` field
**Rationale**:
- Simpler mental model
- Backward compatible (frontend can ignore missing field)
- Groups todo IDs with the tool that returned them
- No new event types needed

### 3. Two-Todo Limit
**Implementation Points**:
- Backend enforces limit when building todo_ids array (`.slice(0, 2)`)
- Frontend also enforces limit when aggregating todo IDs from multiple tool results
- Prevents UI clutter while still showing representative samples
**Future Enhancement**: Could add "Show all X todos" button if more than 2 exist

### 4. TaskCard Reusability
**Challenge**: TaskCard is designed for drag-and-drop context (Today Sheet)
**Options**:
1. Make drag-and-drop optional (conditional rendering)
2. Create separate ChatTaskCard component
3. Extract shared logic to base component

**Recommendation**: Option 1
- Maintains single source of truth
- Reduces code duplication
- TaskCard already has many features (editing, feedback) we want in chat

### 5. Todo Fetching Strategy
**Decision**: Fetch todos by ID when displaying ChatTaskCards
**Alternative**: Include full todo data in tool result

**Recommendation**: Fetch by ID
- Ensures fresh data (if user updates todo elsewhere)
- Smaller SSE payload
- Consistent with rest of app architecture
- Only 2 todos max = minimal performance impact

### 6. Performance Considerations
- **Parallel fetching**: Use `Promise.all()` to fetch 2 todos concurrently
- **Caching**: Consider using TanStack Query for todo fetching (if already used elsewhere)
- **Limited scope**: Max 2 todos per message means performance is not a concern

### 7. Error Handling
- **Todo not found**: Display error message in card slot
- **Network error**: Show retry button
- **Partial failures**: Display successful todos, show error for failed ones
- **JSON parse errors**: Fallback to plain text display

## Testing Strategy

### Unit Tests
1. **ChatToolExecutor.test.ts**:
   - Test JSON response format from `get_todays_todos`
   - Test JSON response format from `search_user_content` with todos
   - Verify todo_ids array is limited to 2
   - Test plain text fallback when no todos

2. **ChatTaskCards.test.tsx**:
   - Test loading state
   - Test error state
   - Test successful todo rendering (1 and 2 todos)
   - Test todo interactions (complete, edit, feedback)

### Integration Tests
1. **Chat Flow with Todos**:
   - Send message asking "What are my todos for today?"
   - Verify SSE stream includes todo_ids in tool_result
   - Verify up to 2 TaskCards render with correct data
   - Verify todo updates reflect in card

2. **Cross-page Consistency**:
   - View todos in chat
   - Navigate to /todos page
   - Complete todo on /todos page
   - Return to chat
   - Verify todo status is updated (requires refresh or refetch)

### Manual Testing Scenarios
1. **Basic Todo Display**:
   - "Show me my todos for today"
   - Verify up to 2 TaskCards appear
   - Verify text list still shows in tool results section

2. **Todo Interactions**:
   - Complete todo from chat card
   - Edit description
   - Submit feedback
   - Verify updates persist

3. **Limit Enforcement**:
   - Search for todos that would return 5+ results
   - Verify only 2 TaskCards show
   - Verify all results still show in text format in tool results

4. **Edge Cases**:
   - Very long todo content
   - Todo with no due date
   - Completed todos in results
   - Network timeout during fetch
   - Invalid todo ID in response

## Migration Plan

### Phase 1: Backend - Tool Result Enhancement (1 day)
- [ ] Update `handleGetTodaysTodos` to return JSON with todo IDs
- [ ] Update `handleSearchContent` to return JSON with todo IDs when todos present
- [ ] Add JSON parsing logic in SSE streaming endpoint
- [ ] Test tool execution manually with curl/Postman
- [ ] Verify backward compatibility (plain text still works)

### Phase 2: Frontend - Data Layer (1 day)
- [ ] Update DisplayMessage interface to include todoIds
- [ ] Modify ChatPage SSE parsing to extract todo IDs from tool results
- [ ] Enforce 2-todo limit in frontend state
- [ ] Test SSE data capture with console logs

### Phase 3: Frontend - UI Components (1-2 days)
- [ ] Create ChatTaskCards component with 2-todo limit
- [ ] Integrate ChatTaskCards into ChatMessage
- [ ] Make TaskCard drag-and-drop optional
- [ ] Style TaskCards for chat context (if needed)

### Phase 4: Testing & Refinement (1 day)
- [ ] Write unit tests for tool result JSON format
- [ ] Manual testing across browsers
- [ ] Test 2-todo limit enforcement
- [ ] Address edge cases
- [ ] Performance verification

### Phase 5: Documentation (0.5 day)
- [ ] Update README with todo display feature
- [ ] Add JSDoc comments to new components
- [ ] Update PROJECT_SPEC.md if needed

**Total Estimated Effort**: 4-5 days

## Success Criteria

1. **Functional**:
   - ✅ Existing tools (`get_todays_todos`, `search_user_content`) return todo IDs
   - ✅ Up to 2 todos appear as TaskCards in chat messages
   - ✅ Users can interact with todos (complete, edit, feedback) from chat
   - ✅ Todo updates persist to database
   - ✅ Cross-page consistency (todo visible in /todos page)
   - ✅ Text results still display in tool results section

2. **UX**:
   - ✅ Clear visual distinction between text results and todo cards
   - ✅ Smooth loading states for TaskCards
   - ✅ Graceful error handling
   - ✅ UI not cluttered (max 2 todos per message)
   - ✅ Responsive design

3. **Technical**:
   - ✅ Clean code following existing patterns
   - ✅ No performance regressions
   - ✅ Backward compatible (plain text tool results still work)
   - ✅ Test coverage for new code
   - ✅ No new tools created (uses existing tools only)

## Future Enhancements (Out of Scope)

- **Show all todos**: "Show all 5 todos" button when more than 2 exist
- **Batch operations**: "Complete all todos in this conversation"
- **Todo creation tool**: Add `create_todo` tool for AI to create todos directly
- **Rich todo preview**: Show original capture link in chat context
- **Todo threading**: Link related todos discussed in same conversation
- **Configurable limit**: User preference for how many todos to display (2-5)

## Dependencies

### Required
- None (uses existing TodosRepository, TaskCard, chat infrastructure, existing tools)

### Optional
- TanStack Query (if implementing caching layer)

## Risks & Mitigation

### Risk 1: TaskCard complexity in chat context
**Mitigation**: Test thoroughly, make drag-and-drop optional, consider simplified variant if issues arise

### Risk 2: JSON parsing errors in tool results
**Mitigation**: Comprehensive error handling, fallback to plain text display, try-catch around JSON.parse

### Risk 3: Performance with todo fetching
**Mitigation**: Limited to 2 todos per message, parallel fetching with Promise.all, minimal impact

### Risk 4: Race conditions (todo updated elsewhere while viewing in chat)
**Mitigation**: Fetch by ID ensures fresh data on load, optimistic UI updates for user interactions

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
1. **Backend**: Enhance existing tools (`get_todays_todos`, `search_user_content`) to return JSON with todo IDs when todos are present
2. **SSE Streaming**: Parse JSON tool results and include todo_ids in SSE events
3. **Frontend**: Capture todo IDs in chat state and display up to 2 as TaskCards
4. **Component**: Reuse existing TaskCard with optional drag-and-drop
5. **Testing**: Comprehensive unit and integration tests

The design maintains consistency with existing patterns, reuses components where possible, and provides a foundation for future chat-based todo management features.

**Key Constraints**:
- No new tool creation (uses existing tools only)
- Maximum 2 todos displayed per message (avoid UI clutter)
- Backward compatible (plain text tool results still work)

**Estimated Effort**: 4-5 days for full implementation and testing
**Complexity**: Low-Medium (simpler than original plan, no new tool creation)
**Priority**: High (improves user experience and chat utility significantly)
