# Development Guide

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (managed via corepack)
- [Docker](https://www.docker.com/)
- [Tilt](https://tilt.dev/) (recommended for local development)

  ```sh
  curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
  ```

## Getting Started

```bash
# Clone the repo
git clone https://github.com/SlayterDev/Mind-Melder.git
cd Mind-Melder

# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env
# Edit .env with your LLM provider key (see docs/LLM_SETUP.md)
```

## Running Locally

### With Tilt (recommended)

Tilt runs Docker containers for `postgres`, `api`, and `web`, matching production as closely as possible. Scripts in `./scripts` are available as manual Tilt resources and do not run on startup.

```bash
tilt up      # Start postgres, api, web containers
tilt down    # Stop all services
```

### With pnpm (requires local PostgreSQL)

```bash
docker compose up -d postgres   # Start PostgreSQL
pnpm db:migrate                 # Run database migrations
pnpm dev                        # Start API + web dev servers
```

- API: http://localhost:3000
- Web: http://localhost:5173

## Database Commands

```bash
pnpm db:migrate    # Run migrations
pnpm db:generate   # Generate migration from schema changes
pnpm db:studio     # Open Drizzle Studio (DB GUI)
```

## Code Quality

```bash
pnpm lint          # Run ESLint
pnpm format        # Format with Prettier
pnpm build         # Build all apps
```

## Testing

```bash
./scripts/test-api.sh              # Test all API endpoints
./scripts/test-organization.sh     # Test LLM organization flow
./scripts/test-today-sheet-api.sh  # Test Today Sheet generation
./scripts/clear-db.sh              # Clear all data
```

## Desktop App (Electron)

```bash
pnpm desktop:dev                   # Start API + Electron app
pnpm desktop:build                 # Build for current platform
pnpm desktop:build:mac             # Build for macOS
pnpm desktop:build:win             # Build for Windows
pnpm desktop:build:linux           # Build for Linux
```

See [ELECTRON_DESKTOP.md](./ELECTRON_DESKTOP.md) for full desktop documentation.

## Building Docker Images Locally

```bash
docker compose build    # Build api and web images
docker compose up -d    # Run the full stack
```

## Project Structure

```
/
├── apps/
│   ├── api/          # Express API server
│   └── web/          # React frontend (Vite + Tailwind CSS)
├── packages/
│   ├── database/     # Drizzle ORM, schema, repositories, migrations
│   ├── types/        # Shared TypeScript types and Zod validation
│   └── llm/          # LLM provider abstractions
├── docs/             # Project documentation
└── docker-compose.yml
```

## Technology Stack

- **Backend**: Node.js, Express, Drizzle ORM
- **Frontend**: React, Vite, Tailwind CSS, TanStack Query
- **Database**: PostgreSQL 16 with full-text search
- **LLM**: OpenAI, Anthropic, or Ollama (configurable)
- **Desktop**: Electron for cross-platform app
- **Dev Tools**: Tilt, pnpm workspaces
- **Deployment**: Docker Compose

See [TECH_STACK.md](./TECH_STACK.md) for detailed rationale.

## Related Docs

- [LLM_SETUP.md](./LLM_SETUP.md) - LLM provider configuration
- [PROJECT_SPEC.md](./PROJECT_SPEC.md) - Feature specification
- [AGENT_PROMPT.md](./AGENT_PROMPT.md) - Engineering guidelines
- [TODAY_SHEET.md](./TODAY_SHEET.md) - Today Sheet feature
- [TAGS.md](./TAGS.md) - Tag management system
- [SEARCH.md](./SEARCH.md) - Full-text search
- [FEEDBACK_API.md](./FEEDBACK_API.md) - Feedback system
