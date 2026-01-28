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

**Tables**: `captures`, `organized_notes`, `todos`, `templates` with proper indexes

**Repositories**: Type-safe CRUD operations for all entities

**LLM Providers**: Pluggable architecture supporting OpenAI, Anthropic, and Ollama (M3)

**Deployment**: Self-hosted via Docker Compose

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
pnpm db:test                     # Test database connection and CRUD

# Development
pnpm dev                         # Start both API and web servers
# API runs on http://localhost:3000
# Web runs on http://localhost:5173

# Code quality
pnpm lint                        # Run ESLint
pnpm format                      # Format with Prettier

# Build
pnpm build                       # Build all apps

# Testing
./test-api.sh                    # Test all API endpoints
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
- State: Zustand (UI state) + TanStack Query (server state - future)
- Styling: Tailwind CSS
- Shortcuts: @github/hotkey or react-hotkeys-hook (future)

**Monorepo**: pnpm workspaces

## Database Schema

**captures**: Raw user inputs with timestamp and metadata (JSONB)
- Indexes: user_id, organized_at, timestamp
- Fields: id, content, timestamp, metadata, user_id, organized_at

**organized_notes**: LLM-processed structured notes
- Indexes: user_id, date, category
- Fields: id, content, category, date, user_id

**todos**: Actionable tasks extracted from captures
- Indexes: user_id, status, due_date
- Fields: id, content, status (enum: pending/completed), due_date, completed_at, user_id

**templates**: User-defined organization prompts for LLM
- Indexes: user_id, is_active
- Fields: id, name, prompt, is_active, user_id

## Repository Pattern

All entities have repositories with common operations:
- `create(data)` - Insert new record
- `findById(id)` - Get by primary key
- `findByUserId(userId)` - Get all for user
- `update(id, data)` - Update record
- `delete(id)` - Delete record

Entity-specific methods:
- `CapturesRepository.findUnorganized()` - Get captures without organized_at
- `CapturesRepository.markAsOrganized(id)` - Set organized_at timestamp
- `TodosRepository.findByStatus(status)` - Filter by pending/completed
- `TodosRepository.markAsCompleted(id)` - Complete a todo
- `TemplatesRepository.findActive()` - Get active templates

## API Endpoints

All endpoints are prefixed with `/api/v1`:

**Captures** (`/captures`):
- POST `/` - Create capture (requires: content, optional: metadata)
- GET `/` - List user's captures
- GET `/unorganized` - Get unorganized captures
- GET `/:id` - Get single capture
- DELETE `/:id` - Delete capture

**Todos** (`/todos`):
- POST `/` - Create todo (requires: content, optional: dueDate)
- GET `/` - List todos (query: ?status=pending|completed)
- GET `/:id` - Get single todo
- PATCH `/:id` - Update todo
- PATCH `/:id/complete` - Mark as completed
- DELETE `/:id` - Delete todo

**Organized Notes** (`/notes`):
- GET `/` - List notes (query: ?category=string)
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

**Organization** (`/organize`):
- POST `/` - Trigger LLM organization (optional: templateId)
- Processes all unorganized captures
- Creates organized notes and todos
- Returns summary of results

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

**Current Milestone: M5 - Scheduling & Export**
- Scheduled organization (cron job for automatic batch processing)
- Markdown export functionality
- Settings management for schedule configuration

**Future Milestones**:
- M6: Deployment (Docker Compose for full stack, production documentation)

**Do NOT implement**:
- Authentication (until explicitly requested)
- Real-time sync/websockets
- Analytics or telemetry
- Features outside current milestone
- Rate limiting or billing logic
- Admin panels or dashboards
- Elaborate class hierarchies (prefer functions and composition)

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
DATABASE_URL=postgresql://user:pass@localhost:5432/capture
# or: DATABASE_URL=file:./data/capture.db

# LLM Provider
LLM_PROVIDER=openai          # openai | anthropic | ollama
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434

# Scheduler
ORGANIZATION_SCHEDULE="0 17 * * *"  # 5 PM daily (cron format)

# Server
API_PORT=3000
WEB_PORT=5173
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
