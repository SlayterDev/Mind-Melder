# Copilot Instructions – Mind Melder

## Architecture Overview

**Mind Melder** is a self-hosted productivity tool following a clean three-tier architecture:

```
Frontend (React/Vite) → API (Express) → Data Layer (Drizzle ORM + PostgreSQL)
                            ↓
                      LLM Providers (OpenAI/Anthropic/Ollama)
```

**Monorepo structure** (pnpm workspaces):
- `apps/api` – Express REST API with versioned endpoints (`/api/v1/*`)
- `apps/web` – React frontend using Vite + Tailwind CSS
- `packages/database` – Drizzle ORM schema, migrations, and repository pattern
- `packages/llm` – Provider-agnostic LLM abstraction layer
- `packages/types` – Shared TypeScript types with Zod validation

**Core workflow**: Users quick-capture thoughts → stored as unorganized captures → LLM organizes into structured notes + actionable todos → Today Sheet prioritizes daily work

## Development Workflow

**Prerequisites**: Copy `.env.example` to `.env` and configure at least one LLM provider.

```bash
# Install dependencies
pnpm install

# Development (use Tilt for Docker-based dev matching production)
tilt up                    # Starts postgres, api, web containers + manual script resources
tilt down                  # Stop all services

# Or run services directly with pnpm (requires local postgres)
pnpm dev                   # Starts both api (port 3000) and web (port 5173) in parallel

# Database operations
docker compose up -d postgres  # Start PostgreSQL only
pnpm db:migrate               # Run pending migrations
pnpm db:generate              # Create new migration from schema changes
pnpm db:studio                # Open Drizzle Studio at http://localhost:4983

# Testing scripts (manual Tilt resources or run directly)
./scripts/test-api.sh          # Test all API endpoints
./scripts/test-organization.sh # Test LLM organization flow
./scripts/clear-db.sh          # Clear all data

# Production build
docker compose build           # Build all containers
docker compose up -d           # Start production stack
```

**Tilt resources**: `postgres`, `api`, `web` auto-start. Scripts (`script-clear-db`, `script-test-api`, etc.) are manual triggers.

## Repository Pattern (Critical)

All database access goes through repository classes in `packages/database/src/repositories/`. **Never write raw SQL queries in API routes or services.**

**Standard repository methods** (all entities):
```typescript
create(data)              // Insert new record
findById(id)              // Get by primary key
findByUserId(userId)      // Get all for user
update(id, data)          // Update record
delete(id)                // Delete record
```

**Entity-specific methods** (examples):
```typescript
CapturesRepository.findUnorganized(userId)  // Get captures where organized=null
CapturesRepository.markAsOrganized(id)      // Set organized timestamp
TodosRepository.findByStatus(userId, status)
TodosRepository.markAsCompleted(id)
TodaySheetsRepository.findMostRecentByDate(userId, date)
```

**See**: `packages/database/src/repositories/captures-repository.ts` for the canonical pattern.

## API Route Pattern

Routes follow a consistent factory pattern with dependency injection:

```typescript
// apps/api/src/routes/captures.ts
import { Router } from 'express';
import { CapturesRepository } from 'database';
import { createCaptureSchema } from 'types';
import { asyncHandler, validateBody, ApiError } from '../middleware/index.js';

export function createCapturesRouter(capturesRepo: CapturesRepository): Router {
  const router = Router();

  router.post('/', 
    validateBody(createCaptureSchema),
    asyncHandler(async (req, res) => {
      const userId = 'test-user-1'; // TODO: Auth in future milestone
      const capture = await capturesRepo.create({ ...req.body, userId });
      res.status(201).json(capture);
    })
  );

  return router;
}
```

**Key patterns**:
- Use `asyncHandler()` wrapper for all async routes (auto-catches errors)
- Validate requests with Zod schemas from `packages/types` via `validateBody()`/`validateQuery()`
- Throw `ApiError(statusCode, message)` for expected errors
- Repository instances injected as parameters to router factory functions
- Routes registered in `apps/api/src/index.ts` with `/api/v1` prefix

## LLM Provider Abstraction

LLM logic is **swappable** via factory pattern in `packages/llm/`:

```typescript
// Usage in services
import { ProviderFactory } from 'llm';

const provider = ProviderFactory.createFromEnv(); // Reads LLM_PROVIDER env var
const result = await provider.generateTodaySheet({ captures, existingTodos, template });
```

**Providers**: OpenAI (default: gpt-4o-mini), Anthropic (default: claude-3-5-sonnet-20241022), Ollama (local models)

**Configure in `.env`**:
```bash
LLM_PROVIDER=openai              # openai | anthropic | ollama
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

**Key interfaces** (`packages/llm/src/types.ts`):
- `LLMProvider.organize()` – Process captures into notes + todos
- `LLMProvider.generateTodaySheet()` – Create daily plan from captures + todos

**Validation**: All LLM responses validated with Zod schemas before persistence (see `packages/llm/src/validation.ts`)

## Today Sheet Feature

**Today Sheet** is the daily command center – an AI-generated prioritized plan for the day.

**Flow** (`apps/api/src/services/today-sheet-service.ts`):
1. Gather unorganized captures + pending todos
2. Get user's template (or default)
3. Call LLM with context (time of day, working hours, current date)
4. LLM returns todos grouped into sections: `must_do_today`, `likely_today`, `opportunistic`, `overflow`
5. Persist today_sheets record with summary and metadata
6. Update todo records with section assignments and estimated minutes

**Sections** (`Todo.todaySheetSection` field):
- `must_do_today` – Critical items due today or overdue
- `likely_today` – Important but flexible
- `opportunistic` – Nice-to-do if time permits
- `overflow` – Defer to tomorrow/this week
- `none` – Not in today's plan

**See**: `docs/TODAY_SHEET.md` for full design, `packages/database/src/schema/today-sheets.ts` for schema

## Database Schema Notes

**Key tables**: `captures`, `organized_notes`, `todos`, `templates`, `today_sheets`, `settings`

**Critical indexes** (optimize common queries):
- `captures`: `user_id`, `organized`, `created_at`
- `todos`: `user_id`, `status`, `due_date`, `today_sheet_section`
- `today_sheets`: `user_id`, `date` (unique constraint on `user_id + date`)

**Timestamps**: All tables have `created_at` and `updated_at` (auto-managed by Drizzle)

**User scoping**: All queries filtered by `userId`. Current hardcoded as `'test-user-1'` – auth is post-MVP.

**Migrations**: Generated via `pnpm db:generate` after schema changes in `packages/database/src/schema/`, applied with `pnpm db:migrate`

## Strict Scope Boundaries

This project follows **milestone-based development**. Check `docs/CLAUDE.md` for current milestone.

**DO NOT implement**:
- Features not in `docs/PROJECT_SPEC.md`
- Features outside current milestone
- Authentication (until explicitly requested)
- Real-time sync, websockets, analytics, rate limiting
- Elaborate class hierarchies (prefer functions + composition)

**BEFORE adding features**: Verify they exist in PROJECT_SPEC.md and are in the current milestone.

## Code Style Conventions

**TypeScript**:
- ES modules (`.js` imports with `.js` extension)
- Interfaces for data types, `type` for unions/intersections
- Zod schemas colocated with types (`packages/types/src/validation.ts`)

**Imports**:
```typescript
import type { Capture } from 'database';  // Type-only imports use 'type'
import { CapturesRepository } from 'database';
```

**Error handling**:
- Throw `ApiError(statusCode, message)` in routes
- Global error handler in `apps/api/src/middleware/error-handler.ts`
- Never log sensitive user content

**Validation**:
- Zod schemas in `packages/types` define both TypeScript types and runtime validation
- Validate at API boundaries only (not internal services/repositories)

## Testing Strategy

**Manual testing scripts** (in `scripts/`):
- `test-api.sh` – Tests all REST endpoints with curl
- `test-organization.sh` – Tests LLM organization flow
- `test-today-sheet-api.sh` – Tests Today Sheet generation

**Database testing**:
- `packages/database/test-today-sheet.ts` – Tests repository methods
- Run with: `pnpm --filter database test` (after `pnpm db:migrate`)

**No automated test suite yet** – current milestone focuses on core functionality.

## Common Pitfalls

1. **Don't bypass repositories** – All DB access through repository classes
2. **Import .js extensions** – ES modules require explicit `.js` in imports
3. **Validate LLM responses** – Always use Zod schemas before persisting AI output
4. **Check userId scoping** – All queries must filter by userId (hardcoded for now)
5. **Use asyncHandler** – Wrap all async Express routes to auto-catch errors
6. **Today Sheet sections** – Use enum values from schema, not magic strings

## Key Files Reference

- **Architecture**: `docs/TECH_STACK.md`, `CLAUDE.md`
- **Feature specs**: `docs/PROJECT_SPEC.md`, `docs/TODAY_SHEET.md`
- **Repository pattern**: `packages/database/src/repositories/captures-repository.ts`
- **API route pattern**: `apps/api/src/routes/captures.ts`
- **LLM abstraction**: `packages/llm/src/provider-factory.ts`
- **Middleware**: `apps/api/src/middleware/validate.ts`, `error-handler.ts`, `async-handler.ts`
- **Schema**: `packages/database/src/schema/` (all tables)
- **Types/validation**: `packages/types/src/validation.ts`
