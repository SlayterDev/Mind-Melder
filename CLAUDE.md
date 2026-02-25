# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A self-hosted productivity tool that captures quick notes throughout the day and uses LLM summarization to organize them into structured notes and actionable todo lists. The core workflow is: **Capture raw input → Store in inbox → Batch organize via LLM → Structure into notes + todos**.

## Architecture

**Monorepo Structure** (✅ Implemented):
```
/
├── apps/
│   ├── api/          # Express API server
│   └── web/          # React frontend (Vite + Tailwind CSS)
├── packages/
│   ├── database/     # ✅ Drizzle ORM, schema, repositories, migrations
│   ├── types/        # ✅ Shared TypeScript types and Zod validation
│   └── llm/          # LLM provider abstractions (future)
├── docs/             # Project documentation
└── docker-compose.yml # ✅ PostgreSQL container
```

**Database**: PostgreSQL 16 with Drizzle ORM

**Tables**: `captures`, `organized_notes`, `todos`, `templates`, `settings`, `tags`, `today_sheets` with proper indexes and full-text search

**Repositories**: Type-safe CRUD operations for all entities

**LLM Providers**: ✅ Pluggable architecture supporting OpenAI, Anthropic, and Ollama

**Today Sheet**: ✅ AI-powered daily planning feature with prioritization and time estimation

**Search**: ✅ Full-text search across captures, notes, and todos using PostgreSQL tsvector

**Desktop**: ✅ Electron app for macOS, Windows, and Linux

**Deployment**: Self-hosted via Docker Compose or Tilt (dev)

## Development Commands

**Prerequisites**: Copy `.env.example` to `.env` and configure your environment variables.

```bash
# Install dependencies
pnpm install

# Database
docker compose up -d postgres    # Start PostgreSQL
pnpm db:migrate                  # Run migrations
pnpm db:generate                 # Generate new migration from schema changes
pnpm db:studio                   # Open Drizzle Studio (DB GUI)

# Development (Tilt recommended - matches production)
tilt up                          # Start postgres, api, web containers + manual script resources
tilt down                        # Stop all services

# Or run services directly with pnpm (requires local postgres)
pnpm dev                         # Start both API and web servers
# API runs on http://localhost:3000
# Web runs on http://localhost:5173

# Desktop app (Electron)
pnpm desktop:dev                 # Start API + Electron app
pnpm desktop:build               # Build desktop app for current platform
pnpm desktop:build:mac           # Build for macOS
pnpm desktop:build:win           # Build for Windows
pnpm desktop:build:linux         # Build for Linux

# Code quality
pnpm lint                        # Run ESLint
pnpm format                      # Format with Prettier

# Build
pnpm build                       # Build all apps

# Testing
./scripts/test-api.sh            # Test all API endpoints
./scripts/test-organization.sh   # Test LLM organization flow
./scripts/test-today-sheet-api.sh # Test Today Sheet generation
./scripts/clear-db.sh            # Clear all data
```

## Technology Decisions

**Backend Stack**:
- Runtime: Node.js 20+
- Framework: Express (chosen over Fastify for familiarity)
- ORM: Drizzle ORM (lightweight, type-safe SQL queries)
- Database: PostgreSQL 16
- Validation: Zod schemas

**Frontend Stack**:
- Framework: React 18 with Vite
- State: TanStack Query (server state) + local state hooks
- Styling: Tailwind CSS
- Routing: React Router v7
- Drag & Drop: @dnd-kit for Today Sheet
- Desktop: Electron with electron-builder

**Monorepo**: pnpm workspaces

## Database Schema

**captures**: Raw user inputs with timestamp and metadata (JSONB)
- Indexes: user_id, organized, timestamp
- Fields: id, content, timestamp, metadata, user_id, organized
- Search: Full-text search via search_vector (tsvector)

**organized_notes**: LLM-processed structured notes
- Indexes: user_id, created_at
- Fields: id, title, content, user_id, created_at, updated_at
- Search: Full-text search on title (weight A) and content (weight B)

**todos**: Actionable tasks extracted from captures
- Indexes: user_id, status, due_date, today_sheet_section
- Fields: id, content, description, status (enum: pending/completed/cancelled), due_date, completed_at, user_id, tags (JSONB), today_sheet_section, estimated_minutes, priority, feedback_vote, feedback_text, feedback_timestamp
- Search: Full-text search on content (weight A), description (weight B), tags (weight B)

**templates**: User-defined organization prompts for LLM
- Indexes: user_id, is_active
- Fields: id, name, prompt, is_active, user_id

**tags**: Global tag definitions for AI-guided categorization
- Indexes: user_id, unique constraint on (user_id, name)
- Fields: id, name, description, user_id

**today_sheets**: AI-generated daily plans
- Indexes: user_id, date (unique constraint on user_id + date)
- Fields: id, user_id, date, summary, metadata (JSONB with sections), created_at, updated_at

**settings**: User preferences and configuration
- Indexes: user_id, key (unique constraint on user_id + key)
- Fields: id, user_id, key, value (JSONB)

## Repository Pattern

All entities have repositories with common operations:
- `create(data)` - Insert new record
- `findById(id)` - Get by primary key
- `findByUserId(userId)` - Get all for user
- `update(id, data)` - Update record
- `delete(id)` - Delete record

Entity-specific methods:
- `CapturesRepository.findUnorganized()` - Get captures where organized=null
- `CapturesRepository.markAsOrganized(id)` - Set organized timestamp
- `TodosRepository.findByStatus(status)` - Filter by pending/completed/cancelled
- `TodosRepository.markAsCompleted(id)` - Complete a todo
- `TodosRepository.submitFeedback(id, vote, text)` - Submit feedback on AI todo
- `TemplatesRepository.findActive()` - Get active templates
- `TagsRepository.findAll(userId)` - Get all tags for user
- `TodaySheetRepository.findMostRecentByDate(userId, date)` - Get today sheet
- `SettingsRepository.get(userId, key)` - Get setting value
- `SettingsRepository.set(userId, key, value)` - Set setting value

## API Endpoints

All endpoints are prefixed with `/api/v1`:

**Captures** (`/captures`):
- POST `/` - Create capture (requires: content, optional: metadata)
- GET `/` - List user's captures
- GET `/unorganized` - Get unorganized captures
- GET `/:id` - Get single capture
- DELETE `/:id` - Delete capture

**Todos** (`/todos`):
- POST `/` - Create todo (requires: content, optional: dueDate, description, tags)
- GET `/` - List todos (query: ?status=pending|completed|cancelled)
- GET `/:id` - Get single todo
- PATCH `/:id` - Update todo
- PATCH `/:id/complete` - Mark as completed
- PATCH `/:id/feedback` - Submit feedback (vote: thumbs_up|thumbs_down|none, optional: feedbackText)
- DELETE `/:id` - Delete todo

**Organized Notes** (`/notes`):
- POST `/` - Create note (requires: title, content)
- GET `/` - List notes
- GET `/:id` - Get single note
- PATCH `/:id` - Update note
- DELETE `/:id` - Delete note

**Templates** (`/templates`):
- POST `/` - Create template (requires: name, prompt)
- GET `/` - List templates
- GET `/active` - Get active templates
- GET `/:id` - Get single template
- PATCH `/:id` - Update template
- DELETE `/:id` - Delete template

**Tags** (`/tags`):
- POST `/` - Create tag (requires: name, optional: description)
- GET `/` - List all tags
- GET `/:id` - Get single tag
- PATCH `/:id` - Update tag
- DELETE `/:id` - Delete tag

**Organization** (`/organize`):
- POST `/` - Trigger LLM organization (optional: templateId)
- Processes all unorganized captures
- Creates organized notes and todos
- Returns summary of results

**Today Sheet** (`/today-sheet`):
- POST `/generate` - Generate Today Sheet from captures and todos
- GET `/` - Get current Today Sheet
- PATCH `/todos/:id` - Update a todo in the sheet
- PATCH `/reorder` - Bulk reorder todos

**Search** (`/search`):
- GET `/?q={query}&type={all|captures|todos|notes}` - Full-text search

**Settings** (`/settings`):
- GET `/:key` - Get setting value
- POST `/` - Set setting value (requires: key, value)
- GET `/` - List all settings

**Ollama** (`/ollama`):
- GET `/models` - List available Ollama models
- GET `/health` - Check Ollama connection

## LLM Integration

**Supported Providers:**
- **OpenAI** - GPT-4o-mini (default), GPT-4, etc.
- **Anthropic** - Claude 3.5 Sonnet (default), Claude 3 Opus, etc.
- **Ollama** - Local models (Llama 3.1, Mistral, etc.)

**Configuration** (`.env`):
```bash
LLM_PROVIDER=openai              # openai | anthropic | ollama
OPENAI_API_KEY=sk-...            # For OpenAI
ANTHROPIC_API_KEY=sk-ant-...     # For Anthropic
OLLAMA_BASE_URL=http://localhost:11434  # For Ollama
```

**Organization Flow:**
1. User creates a template with organization instructions
2. Captures accumulate in the inbox (unorganized)
3. POST `/api/v1/organize` triggers the LLM
4. LLM processes captures using template
5. System creates organized notes (categorized) and todos (with due dates)
6. Captures are marked as organized

**See:** `docs/LLM_SETUP.md` for detailed setup guide and testing instructions.

## Strict Scope Boundaries

This project follows milestone-based development with NO feature creep:

**Completed Milestones**:
- ✅ M1: Core Data Layer (schema, repositories, migrations, validation)
- ✅ M2: API Foundation (REST endpoints, validation, error handling)
- ✅ M3: LLM Integration (provider abstraction, OpenAI/Anthropic/Ollama adapters, organization service)
- ✅ M4: Basic UI (React frontend, capture/inbox/notes/todos/templates views, organization trigger)
- ✅ M5: Today Sheet (AI-powered daily planning with phases 1-4 complete)
- ✅ Tags Feature (Global tag management for AI-guided categorization)
- ✅ Search Feature (Full-text search across captures, notes, and todos)
- ✅ Feedback Feature (User feedback on AI-generated todos)
- ✅ Desktop App (Electron wrapper for cross-platform desktop deployment)

**Current Status**: Core feature set complete. Focus on refinement, bug fixes, and user experience improvements.

**Do NOT implement**:
- Authentication (until explicitly requested)
- Real-time sync/websockets
- Analytics or telemetry
- Features outside current milestone
- Rate limiting or billing logic
- Admin panels or dashboards
- Elaborate class hierarchies (prefer functions and composition)

## Logging

The API uses a structured logger at `apps/api/src/utils/logger.ts`. See **`docs/LOGGING.md`** for the full guide.

**Quick reference:**

```typescript
import { createLogger } from '../utils/logger.js';
const logger = createLogger('MyService'); // context label, PascalCase

logger.debug('Intermediate state', { userId, count });     // suppressed in prod by default
logger.info('Operation started', { userId });              // normal events
logger.warn('Unexpected but recoverable', { userId });     // non-fatal issues
logger.error('Operation failed', { userId, message });     // fatal to the operation
logger.errorWithException('Unhandled failure', err, { userId }); // preserves stack trace
```

**Rules:**
- Create one logger per module at the top level — never per request
- Always include `userId` in service/route log lines
- Never log raw user content (note text, capture body, todo text)
- Never log credentials, API keys, or full settings objects
- Use `debug` for counts and intermediate state; `info` for start/end of significant operations
- Log level is controlled by `LOG_LEVEL` env var (default: `info`); `NODE_ENV=production` switches to JSON output

**Request correlation:** Every HTTP request gets a UUID (`requestId`) emitted on both the "received" and "completed" lines, and returned to the client as `X-Request-Id`.

## Engineering Principles

**Architecture**:
- RESTful API with versioned endpoints
- Database-agnostic data layer
- Provider-agnostic LLM interface
- Clear separation: data layer → business logic → API routes → UI components

**Code Quality**:
- Start with interfaces/types before implementation
- Prefer composition and dependency injection for testability
- Self-documenting code with clear naming
- Comments only for non-obvious logic
- Validate inputs at API boundaries only

**Security**:
- Sanitize all user inputs before storage
- Validate LLM responses before persisting
- Never log sensitive user content
- Design for multi-tenancy from the start (even if single-user initially)

**Before Writing Code**:
1. Verify feature exists in docs/PROJECT_SPEC.md
2. Confirm it's in the current milestone (docs/AGENT_PROMPT.md)
3. Ask clarifying questions if ambiguous

## Configuration

Environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/capture

# LLM Provider
LLM_PROVIDER=openai          # openai | anthropic | ollama
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434

# Server
API_PORT=3000
WEB_PORT=8080
NODE_ENV=development

# Logging (see docs/LOGGING.md)
LOG_LEVEL=info               # debug | info | warn | error

# Timezone
TZ=America/Chicago
```

## LLM Provider Abstraction

Keep LLM provider logic swappable behind a clean interface in `/packages/llm/providers/`:

```typescript
interface LLMProvider {
  organize(captures: Capture[], template: Template): Promise<OrganizedResult>
  extractTasks(text: string): Promise<Task[]>
}
```

Implementations: OpenAI adapter, Anthropic adapter, Ollama adapter.

## Key Documentation

- **docs/PROJECT_SPEC.md**: Complete feature specification (One Prompt Template format)
- **docs/AGENT_PROMPT.md**: Engineering guidelines, constraints, and milestone details
- **docs/TECH_STACK.md**: Technology choices and architecture decisions

All features must be explicitly defined in PROJECT_SPEC.md before implementation.
