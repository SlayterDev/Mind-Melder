# Quick Capture & AI Organizer

A self-hosted productivity tool that captures quick notes throughout the day and uses LLM summarization to organize them into structured notes and actionable todo lists.

---

## Documentation

- **[PROJECT_SPEC.md](./PROJECT_SPEC.md)** – Complete feature specification (One Prompt Template format)
- **[AGENT_PROMPT.md](./AGENT_PROMPT.md)** – Engineering guidelines and constraints for Claude Code
- **[TECH_STACK.md](./TECH_STACK.md)** – Technology choices and architecture decisions
- **[TAGS.md](./docs/TAGS.md)** – Global tag management system documentation

---

## Deployment

**Pre-requisites:**

- Docker
- Tilt (for local development)
   
    ```sh
    curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
    ```
- pnpm - (development only)

Copy `.env.example` to `.env`. You need to setup at least one LLM provider. Paste in your key and set the provider in `LLM_PROVIDER`.

```bash
# Build containers
docker compose build

# Start containers
docker compose up -d
```
UI is available at `http://<your_ip>:8080`

---

## Quick Start (Development)

```bash
# Clone and install dependencies
pnpm install

# Start development environment (Tilt)
tilt up

# Optional: stop Tilt
tilt down

# Build for production
pnpm build

# Deploy with Docker
docker-compose up -d
```

Tilt runs the Docker containers for `postgres`, `api`, and `web`, matching production as closely as possible.
Scripts in `./scripts` are available as manual Tilt resources and do not run on startup.

---

## Project Structure

```
/
├── apps/
│   ├── api/          # Backend API server
│   └── web/          # React frontend
├── packages/
│   ├── database/     # Database schema and client
│   ├── types/        # Shared TypeScript types
│   └── llm/          # LLM provider abstractions
├── docs/             # Project documentation
└── docker-compose.yml
```

---

## Key Features

- ⚡ Quick capture with keyboard shortcut (Cmd/Ctrl+Shift+N)
- 🤖 LLM-powered organization (OpenAI, Anthropic, Ollama)
- 🏷️ Global tag management for AI-guided categorization
- 📝 User-defined templates for personalized structure
- ✅ Automatic task extraction from natural language
- 📅 Scheduled batch organization (future)
- 📤 Markdown export for portability (future)
- 🐳 Self-hosted via Docker Compose

---

## Configuration

Set environment variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/capture
# or for SQLite:
# DATABASE_URL=file:./data/capture.db

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

---

## Usage Flow

1. **Capture**: Hit keyboard shortcut anywhere → Type note → Enter
2. **Organize**: Click "Organize Now" or wait for scheduled run
3. **Review**: Check Organized Notes and Todo List
4. **Complete**: Check off todos as you finish them
5. **Export**: Download Markdown archive of your work

---

## Technology Stack

- **Backend**: Node.js, Fastify, Drizzle ORM
- **Frontend**: React, Vite, Tailwind CSS, Zustand
- **Database**: PostgreSQL (production) / SQLite (dev)
- **LLM**: OpenAI, Anthropic, or Ollama (configurable)
- **Deployment**: Docker Compose

See [TECH_STACK.md](./TECH_STACK.md) for detailed rationale.

---

## Contributing

This project follows strict scope boundaries defined in PROJECT_SPEC.md.

Before adding features:
1. Verify feature exists in PROJECT_SPEC.md
2. Confirm it's in the current milestone (AGENT_PROMPT.md)
3. Ask clarifying questions if ambiguous

See AGENT_PROMPT.md for detailed engineering guidelines.

---

## License

TBD (define before public release)
