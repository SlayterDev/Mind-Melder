# TECH_STACK.md

## Overview

This document defines the technology stack for the Quick Capture & AI Organizer. Choices prioritize developer experience, self-hosting simplicity, and extensibility.

---

## Backend

### Runtime
- **Node.js 20+** (LTS)
  - Rationale: Mature ecosystem, excellent async I/O for API tasks, TypeScript support

### Framework
- **Fastify** or **Express**
  - Fastify preferred for performance and built-in validation
  - Express acceptable for familiarity
  - Decision: Confirm with implementer

### Database
- **PostgreSQL 16** (production)
- **SQLite** (development/single-user)
  - Rationale: PostgreSQL for scalability, SQLite for zero-config local use

### ORM/Query Builder
- **Drizzle ORM** (recommended) or **Prisma**
  - Drizzle: Lightweight, SQL-like, great TypeScript inference
  - Prisma: More mature, better migrations, heavier
  - Decision: Confirm with implementer

### Scheduler
- **node-cron** or **BullMQ**
  - node-cron for simplicity (in-process)
  - BullMQ if Redis is added (overkill for v1)
  - Decision: Start with node-cron

---

## Frontend

### Framework
- **React 18+** with **Vite**
  - Rationale: Fast dev experience, component reusability, large ecosystem

### State Management
- **Zustand** or **TanStack Query**
  - Zustand for global UI state (theme, active template)
  - TanStack Query for server state (captures, todos)
  - Avoid Redux—overkill for this app

### Styling
- **Tailwind CSS**
  - Rationale: Rapid prototyping, utility-first, easy dark mode
  - Alternative: Plain CSS modules if preferred

### Keyboard Shortcuts
- **@github/hotkey** or **react-hotkeys-hook**
  - Lightweight, declarative shortcut handling

---

## LLM Integration

### Provider Interface
- Custom abstraction layer in `/backend/src/llm/providers/`
- Adapters for:
  - **OpenAI** (via `openai` npm package)
  - **Anthropic** (via `@anthropic-ai/sdk`)
  - **Ollama** (via REST API fetch)

### Configuration
- Provider selected via environment variable: `LLM_PROVIDER=openai|anthropic|ollama`
- API keys stored in `.env`
- Ollama endpoint configurable: `OLLAMA_BASE_URL=http://localhost:11434`

---

## Monorepo Structure

### Tool
- **pnpm workspaces** (recommended) or **npm workspaces**
  - Rationale: pnpm is faster, saves disk space, handles peer deps well
  - No Turborepo/Nx needed initially—vanilla workspaces sufficient

### Layout
```
/
├── apps/
│   ├── api/          # Backend Fastify/Express server
│   └── web/          # React Vite frontend
├── packages/
│   ├── database/     # Shared schema, migrations, client
│   ├── types/        # Shared TypeScript types
│   └── llm/          # LLM provider abstractions (if shared)
├── docker-compose.yml
├── package.json      # Workspace root
└── docs/             # Project documentation
```

---

## Development Tools

### TypeScript
- Strict mode enabled
- Shared `tsconfig.base.json` at root

### Linting/Formatting
- **ESLint** + **Prettier**
- Config extends `@antfu/eslint-config` or similar opinionated preset

### Testing (Future)
- **Vitest** for unit tests
- **Playwright** for E2E (if needed)
- Not required for M1-M3

---

## Deployment

### Self-Hosted (Docker Compose)
- Services:
  - `api` (Node.js backend)
  - `postgres` (PostgreSQL 16)
  - `web` (Nginx serving built React app)
- Volumes for persistent data
- `.env` file for configuration

### Optional: Marketable Deployment
- **Backend**: Fly.io, Railway, or Render
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Database**: Managed PostgreSQL (Supabase, Neon, RDS)
- **Auth**: Clerk or Supabase Auth (when multi-user added)

---

## File Formats

### Export
- **Markdown** (`.md`) for notes and todos
- JSON export as fallback for programmatic access

### Configuration
- `.env` for environment variables
- JSON or YAML for user settings (stored in DB, not filesystem)

---

## Decisions Required Before M1

1. **ORM Choice**: Drizzle or Prisma?
2. **Backend Framework**: Fastify or Express?
3. **Monorepo Tool**: pnpm or npm workspaces?

Recommend:
- **Drizzle** (lighter, modern)
- **Fastify** (faster, better validation)
- **pnpm** (faster, efficient)

Await confirmation before scaffolding.
