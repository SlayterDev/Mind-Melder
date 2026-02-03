# Full-Text Search API

## Overview

The Mind Melder application now supports full-text search across captures, todos, and organized notes using PostgreSQL's powerful tsvector and GIN indexing capabilities.

## Database Schema

### Search Columns

Each searchable table now includes a `search_vector` column of type `tsvector` that is automatically maintained using PostgreSQL's `GENERATED ALWAYS AS` feature:

**Captures Table:**
- Searches: `content`
- No weighting (single field)

**Todos Table:**
- Searches: `content` (weight A), `description` (weight B)
- Title/content matches rank higher than description matches

**Organized Notes Table:**
- Searches: `title` (weight A), `content` (weight B)
- Title matches rank higher than content matches

### Indexes

GIN (Generalized Inverted Index) indexes are created on all `search_vector` columns for optimal performance:
- `captures_search_vector_idx`
- `todos_search_vector_idx`
- `organized_notes_search_vector_idx`

## API Endpoint

### Search

**Endpoint:** `GET /api/v1/search`

**Query Parameters:**
- `q` (required): The search query string
- `type` (optional): Filter results by entity type
  - Valid values: `all`, `captures`, `todos`, `notes`
  - Default: `all`

**Example Requests:**

```bash
# Search all entity types
curl "http://localhost:3000/api/v1/search?q=React"

# Search only captures
curl "http://localhost:3000/api/v1/search?q=meeting&type=captures"

# Search only todos
curl "http://localhost:3000/api/v1/search?q=urgent&type=todos"

# Search only notes
curl "http://localhost:3000/api/v1/search?q=documentation&type=notes"
```

**Response Format:**

```json
{
  "captures": [
    {
      "id": "uuid",
      "content": "Meeting about React project",
      "timestamp": "2024-01-01T10:00:00Z",
      "metadata": null,
      "userId": "test-user-1",
      "organized": null,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z",
      "type": "capture"
    }
  ],
  "todos": [
    {
      "id": "uuid",
      "content": "Review React documentation",
      "description": "Study hooks and context API",
      "status": "pending",
      "type": "todo",
      ...
    }
  ],
  "notes": [
    {
      "id": "uuid",
      "title": "React Best Practices",
      "content": "Always use functional components...",
      "category": "development",
      "type": "note",
      ...
    }
  ]
}
```

**Notes:**
- Results are ordered by relevance using PostgreSQL's `ts_rank` function
- Weight A fields (titles, todo content) rank higher than weight B fields (descriptions, note content)
- Empty arrays are returned for entity types with no matches
- Entity types not requested via the `type` parameter are excluded from the response

## Repository Methods

All three repositories now include a `search(userId: string, query: string)` method:

```typescript
// CapturesRepository
const results = await capturesRepo.search(userId, 'meeting');

// TodosRepository
const results = await todosRepo.search(userId, 'urgent');

// OrganizedNotesRepository
const results = await notesRepo.search(userId, 'documentation');
```

## Migration

The search functionality is added via migration `0007_add_search_vectors.sql`. The migration:
1. Adds `search_vector` columns to all three tables
2. Configures them as GENERATED ALWAYS AS STORED columns
3. Creates GIN indexes for optimal search performance

The search vectors update automatically when content changes, requiring no manual maintenance.

## Search Features

- **Full-text search**: Natural language queries (e.g., "React components")
- **Stemming**: Finds variations of words (e.g., "running" matches "run")
- **Stop words**: Common words like "the", "a", "is" are ignored
- **Ranking**: Results ordered by relevance
- **Weighted search**: Title matches prioritized over content matches
- **Case-insensitive**: Searches work regardless of capitalization

## Performance Considerations

- GIN indexes provide fast search even with large datasets
- Generated columns update automatically on INSERT/UPDATE
- No application-level maintenance required
- Query performance scales well with proper indexing
