# AI Feedback API Documentation

This document describes the feedback API endpoints added to track user feedback on AI-generated todos.

## Overview

The feedback feature allows users to provide thumbs up/down ratings on todos that were generated or organized by the AI. Users can optionally provide feedback text (max 100 characters) when giving a thumbs down rating.

## Database Schema

The `todos` table includes the following feedback fields:

- `feedback_vote` (enum): One of `'thumbs_up'`, `'thumbs_down'`, or `'none'` (default)
- `feedback_text` (text, nullable): Optional feedback text (max 100 characters)
- `feedback_timestamp` (timestamp, nullable): When the feedback was last submitted

## API Endpoint

### Submit Feedback

**Endpoint:** `PATCH /api/v1/todos/:id/feedback`

**Description:** Submit or update feedback for a todo.

**Request Body:**
```json
{
  "vote": "thumbs_up" | "thumbs_down" | "none",
  "feedbackText": "Optional feedback text (max 100 chars)"
}
```

**Response:** Returns the updated todo object with feedback fields populated.

**Example - Thumbs Up:**
```bash
curl -X PATCH http://localhost:3000/api/v1/todos/{id}/feedback \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_up"}'
```

**Example - Thumbs Down with Text:**
```bash
curl -X PATCH http://localhost:3000/api/v1/todos/{id}/feedback \
  -H "Content-Type: application/json" \
  -d '{"vote": "thumbs_down", "feedbackText": "Task is unclear"}'
```

**Example - Reset Feedback:**
```bash
curl -X PATCH http://localhost:3000/api/v1/todos/{id}/feedback \
  -H "Content-Type: application/json" \
  -d '{"vote": "none"}'
```

## Validation Rules

1. **vote** (required): Must be one of `'thumbs_up'`, `'thumbs_down'`, or `'none'`
2. **feedbackText** (optional): Must be 100 characters or less

## Error Responses

**Invalid vote value:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "vote",
      "message": "Invalid enum value. Expected 'thumbs_up' | 'thumbs_down' | 'none', received 'invalid_vote'"
    }
  ]
}
```

**Feedback text too long:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": "feedbackText",
      "message": "Feedback text must be 100 characters or less"
    }
  ]
}
```

**Todo not found:**
```json
{
  "error": "Todo not found"
}
```

## TypeScript Types

```typescript
import { FeedbackVote, SubmitFeedbackInput } from 'types';

// Vote enum type
type FeedbackVote = 'thumbs_up' | 'thumbs_down' | 'none';

// Submit feedback input type
interface SubmitFeedbackInput {
  vote: FeedbackVote;
  feedbackText?: string;
}

// Todo type includes feedback fields
interface Todo {
  id: string;
  content: string;
  // ... other fields
  feedbackVote: FeedbackVote;
  feedbackText: string | null;
  feedbackTimestamp: Date | null;
}
```

## Repository Method

```typescript
import { TodosRepository } from 'database';

// Submit feedback for a todo
await todosRepository.submitFeedback(
  todoId,
  'thumbs_down',
  'Optional feedback text'
);
```

## Testing

Run the test script to verify the feedback API:

```bash
./scripts/test-feedback-api.sh
```

This script tests:
- Creating todos with default feedback state
- Submitting thumbs up feedback
- Submitting thumbs down feedback with text
- Validation of feedback text length
- Validation of vote values
- Resetting feedback to 'none'

## Future Enhancements

As per issue #38, future work includes:
- Feeding feedback back to LLM flows for reinforcement learning
- Analytics dashboard to track feedback trends
- Filtering todos by feedback status
