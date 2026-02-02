# Tags Feature Documentation

## Overview

The Tags feature provides a global tag management system that allows users to define custom categories for AI-powered note organization. Tags help guide the LLM during the organization process, ensuring notes are categorized according to user preferences.

## Purpose

When organizing captured notes, the AI can benefit from knowing which categories are important to the user. Instead of inventing categories from scratch each time, the AI can use pre-defined tags that match the user's workflow and mental model.

## Architecture

### Database Schema

The `tags` table stores user-defined category tags:

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT tags_user_name_unique UNIQUE(user_id, name)
);

CREATE INDEX tags_user_id_idx ON tags(user_id);
```

**Key constraints:**
- Each user can have only one tag with a given name (enforced at DB level)
- Tag names are limited to 50 characters
- Tag descriptions are optional and limited to 200 characters (token-conscious design)

### API Endpoints

All endpoints are prefixed with `/api/v1/tags`:

#### Create Tag
```http
POST /api/v1/tags
Content-Type: application/json

{
  "name": "Work",
  "description": "Work-related tasks and notes"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Work",
  "description": "Work-related tasks and notes",
  "userId": "test-user-1",
  "createdAt": "2026-02-01T20:48:01.804Z",
  "updatedAt": "2026-02-01T20:48:01.804Z"
}
```

#### List All Tags
```http
GET /api/v1/tags
```

Returns an array of all tags for the authenticated user.

#### Get Single Tag
```http
GET /api/v1/tags/:id
```

#### Update Tag
```http
PATCH /api/v1/tags/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Delete Tag
```http
DELETE /api/v1/tags/:id
```

Returns 204 No Content on success.

### Repository Pattern

The `TagsRepository` provides CRUD operations:

```typescript
class TagsRepository {
  async create(data: NewTag): Promise<Tag>
  async findById(id: string): Promise<Tag | undefined>
  async findByUserId(userId: string): Promise<Tag[]>
  async update(id: string, data: Partial<Tag>): Promise<Tag | undefined>
  async delete(id: string): Promise<void>
}
```

### Validation

Input validation uses Zod schemas:

```typescript
const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long').optional(),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
});
```

## LLM Integration

### How Tags Affect Organization

When the organization process is triggered:

1. **Fetch Tags**: `OrganizationService` fetches all user tags from the database
2. **Extract Names**: Tag names are extracted into a simple array
3. **Pass to LLM**: The array is passed to the LLM provider's `organize()` method
4. **Prompt Enhancement**: Tags are included in the system prompt

### Prompt Structure

The `BaseLLMProvider.buildOrganizePrompt()` method constructs the prompt:

**With tags defined:**
```
Categorization tags: Use the following tags to categorize notes: Work, Personal, Ideas, Health. 
If none fit, you may suggest a new tag.
```

**Without tags:**
```
Categorization: Use your best judgment to categorize notes into meaningful groups.
```

### Provider Support

All three LLM providers support the tags parameter:

```typescript
interface LLMProvider {
  organize(
    captures: Capture[], 
    template: Template, 
    tags?: string[]  // Optional array of tag names
  ): Promise<OrganizedOutput>;
}
```

**Supported providers:**
- OpenAI (GPT-4, GPT-4o-mini, etc.)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
- Ollama (Local models like Llama 3.1, Mistral, etc.)

## Usage Workflow

### 1. Create Tags (One-time Setup)

Users create tags that match their workflow:

```bash
curl -X POST http://localhost:3000/api/v1/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "Work", "description": "Professional tasks"}'

curl -X POST http://localhost:3000/api/v1/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "Personal", "description": "Personal errands"}'

curl -X POST http://localhost:3000/api/v1/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "Ideas", "description": "Creative ideas"}'
```

### 2. Capture Notes

Users create captures throughout the day:

```bash
curl -X POST http://localhost:3000/api/v1/captures \
  -H "Content-Type: application/json" \
  -d '{"content": "Review PR #482 - security fix needed"}'

curl -X POST http://localhost:3000/api/v1/captures \
  -H "Content-Type: application/json" \
  -d '{"content": "Buy groceries: milk, eggs, bread"}'
```

### 3. Trigger Organization

When ready to organize:

```bash
curl -X POST http://localhost:3000/api/v1/organize \
  -H "Content-Type: application/json" \
  -d '{"templateId": "optional-template-id"}'
```

The system automatically:
- Fetches user's tags
- Passes them to the LLM
- LLM categorizes notes using the provided tags

### 4. View Results

Check organized notes with categories:

```bash
curl http://localhost:3000/api/v1/notes | jq '.[] | {category, content}'
```

Expected output:
```json
{
  "category": "Work",
  "content": "Review PR #482 for security fix"
}
{
  "category": "Personal",
  "content": "Buy groceries: milk, eggs, bread"
}
```

## Design Decisions

### Global Tags vs. Per-Template Tags

**Decision:** Tags are global to the application, not scoped to individual templates.

**Rationale:**
1. **Reusability**: Same tags can be used across different organization templates
2. **Consistency**: Maintains consistent categorization across all organization sessions
3. **Simplicity**: Single source of truth for user's category preferences
4. **Flexibility**: Users can still customize via templates while tags provide base categories

### Token Consciousness

**Decision:** Tag descriptions are optional and limited to 200 characters.

**Rationale:**
1. **Cost**: LLM API calls are charged per token
2. **Efficiency**: Brief descriptions are usually sufficient for categorization
3. **Performance**: Smaller prompts = faster responses
4. **Scaling**: Supports users with dozens of tags without bloating prompts

### Unique Constraint

**Decision:** Each user can have only one tag with a given name (enforced at database level).

**Rationale:**
1. **Clarity**: Prevents confusion when LLM tries to categorize
2. **UX**: Cleaner UI - no duplicate tags to choose from
3. **Data Integrity**: Enforced at DB level, not just application level

## Testing

### Manual Testing

Two test scripts are provided:

1. **`scripts/test-tags.sh`** - Tests tag CRUD operations
2. **`scripts/test-organization-with-tags.sh`** - Tests full organization workflow with tags

Run tests:
```bash
# Ensure API and PostgreSQL are running
pnpm dev  # In one terminal
docker compose up -d postgres

# In another terminal
./scripts/test-tags.sh
./scripts/test-organization-with-tags.sh
```

### Example Test Output

```bash
=== Creating test tags ===
Created tag: Work (ID: uuid-1)
Created tag: Personal (ID: uuid-2)
Created tag: Ideas (ID: uuid-3)

=== Listing all tags ===
{
  "name": "Work",
  "description": "Professional tasks and projects"
}
{
  "name": "Personal",
  "description": "Personal errands and activities"
}
...

=== Integration Summary ===
✓ Tags table created with proper schema
✓ Tags API endpoints (CRUD operations)
✓ Tags fetched by OrganizationService
✓ Tags passed to LLM provider interface
✓ All providers (OpenAI, Anthropic, Ollama) support tags
```

## Future Enhancements

Potential improvements for future releases:

1. **Frontend UI**: Web interface for managing tags (drag-to-reorder, color coding)
2. **Tag Analytics**: Show which tags are used most frequently
3. **Tag Suggestions**: LLM suggests tags based on capture patterns
4. **Hierarchical Tags**: Support parent/child tag relationships
5. **Tag Filtering**: Filter notes and todos by tags in the UI
6. **Tag Export**: Include tags in markdown export functionality

## Migration History

- **0004_flaky_redwing.sql**: Initial tags table creation with indexes and constraints

## Related Documentation

- [LLM Setup](./LLM_SETUP.md) - Configuring LLM providers
- [Project Spec](./PROJECT_SPEC.md) - Overall feature specifications
- [Tech Stack](./TECH_STACK.md) - Technology decisions and architecture
