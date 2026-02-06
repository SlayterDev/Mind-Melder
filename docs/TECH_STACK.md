# TECH_STACK.md

## Overview

This document defines the technology stack for the Quick Capture & AI Organizer. Choices prioritize developer experience, self-hosting simplicity, and extensibility.

---

## Backend

### Runtime
- **Node.js 20+** (LTS)
  - Rationale: Mature ecosystem, excellent async I/O for API tasks, TypeScript support

### Framework
- **Express**
  - Chosen for familiarity and ecosystem maturity
  - Excellent middleware support
  - Well-documented and widely adopted

### Database
- **PostgreSQL 16** (production and development)
  - Rationale: Excellent full-text search with tsvector/GIN indexes
  - JSONB support for flexible metadata
  - Production-ready for self-hosting

### ORM/Query Builder
- **Drizzle ORM**
  - Lightweight, SQL-like syntax
  - Excellent TypeScript inference
  - Type-safe migrations
  - Perfect for PostgreSQL full-text search

### Scheduler
- **Not implemented yet**
  - Planned: node-cron for simplicity (in-process)
  - Alternative: BullMQ if Redis is added
  - Manual organization via UI currently available

---

## Frontend

### Framework
- **React 18+** with **Vite**
  - Rationale: Fast dev experience, component reusability, large ecosystem

### State Management
- **TanStack Query (React Query)** for server state
  - Automatic caching and refetching
  - Optimistic updates
  - Excellent for API-driven apps
- **Local React state** (useState, useReducer) for UI state
  - No global state library needed for current scope

### Styling
- **Tailwind CSS**
  - Rationale: Rapid prototyping, utility-first, easy dark mode
  - Consistent design system

### Routing
- **React Router v7**
  - Type-safe routing
  - Loader functions for data fetching
  - Works well with TanStack Query

### Drag & Drop
- **@dnd-kit**
  - Modern, accessible drag-and-drop
  - Used for Today Sheet todo reordering
  - Touch-friendly

### Desktop
- **Electron**
  - Cross-platform desktop app (macOS, Windows, Linux)
  - electron-builder for packaging
  - Global keyboard shortcut for quick capture

---

## LLM Integration

### Provider Interface
- Custom abstraction layer in `packages/llm/src/providers/`
- ✅ Implemented adapters:
  - **OpenAI** (via `openai` npm package) - Default: gpt-4o-mini
  - **Anthropic** (via `@anthropic-ai/sdk`) - Default: claude-3-5-sonnet-20241022
  - **Ollama** (via `ollama` npm package) - Local models

### Configuration
- Provider selected via environment variable: `LLM_PROVIDER=openai|anthropic|ollama`
- API keys stored in `.env`
- Ollama endpoint configurable: `OLLAMA_BASE_URL=http://localhost:11434`
- Ollama model selection available via settings UI

---

## Monorepo Structure

### Tool
- **pnpm workspaces**
  - Faster than npm, saves disk space
  - Handles peer deps well
  - No Turborepo/Nx needed—vanilla workspaces sufficient

### Layout
```
/
├── apps/
│   ├── api/          # Backend Express server
│   └── web/          # React Vite frontend + Electron wrapper
├── packages/
│   ├── database/     # Shared schema, migrations, repositories
│   ├── types/        # Shared TypeScript types + Zod validation
│   └── llm/          # LLM provider abstractions
├── scripts/          # Testing and utility scripts
├── docker-compose.yml # PostgreSQL + API + Web containers
├── Tiltfile          # Local development orchestration
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
