# Quick Capture & AI Organizer

A self-hosted productivity tool that captures quick notes throughout the day and uses LLM summarization to organize them into structured notes and actionable todo lists.

---

## Documentation

- **[PROJECT_SPEC.md](./docs/PROJECT_SPEC.md)** – Complete feature specification (One Prompt Template format)
- **[AGENT_PROMPT.md](./docs/AGENT_PROMPT.md)** – Engineering guidelines and constraints for Claude Code
- **[TECH_STACK.md](./docs/TECH_STACK.md)** – Technology choices and architecture decisions
- **[TAGS.md](./docs/TAGS.md)** – Global tag management system documentation
- **[TODAY_SHEET.md](./docs/TODAY_SHEET.md)** – AI-powered daily planning feature
- **[SEARCH.md](./docs/SEARCH.md)** – Full-text search capabilities
- **[FEEDBACK_API.md](./docs/FEEDBACK_API.md)** – User feedback on AI-generated todos
- **[ELECTRON_DESKTOP.md](./docs/ELECTRON_DESKTOP.md)** – Desktop application setup
- **[LLM_SETUP.md](./docs/LLM_SETUP.md)** – LLM provider configuration guide

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
- 📋 Today Sheet - AI-generated daily prioritized plan
- 🏷️ Global tag management for AI-guided categorization
- 🔍 Full-text search across captures, notes, and todos
- 📝 User-defined templates for personalized structure
- ✅ Automatic task extraction from natural language
- 👍 Feedback system for AI-generated todos
- 💻 Desktop app via Electron (macOS, Windows, Linux)
- 🐳 Self-hosted via Docker Compose or Tilt

---

## Configuration

Set environment variables in `.env`:

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

# Timezone
TZ=America/Chicago
```

See [LLM_SETUP.md](./docs/LLM_SETUP.md) for detailed LLM provider setup.

---

## Usage Flow

1. **Capture**: Hit keyboard shortcut anywhere → Type note → Enter
2. **Organize**: Click "Organize Now" to process captures with AI
3. **Today Sheet**: Generate AI-powered daily plan from captures and todos
4. **Search**: Full-text search across all captures, notes, and todos
5. **Review**: Check Organized Notes and Todo List with tags
6. **Feedback**: Rate AI-generated todos with thumbs up/down
7. **Complete**: Check off todos as you finish them

---

## Technology Stack

- **Backend**: Node.js, Express, Drizzle ORM
- **Frontend**: React, Vite, Tailwind CSS, TanStack Query
- **Database**: PostgreSQL 16 with full-text search
- **LLM**: OpenAI, Anthropic, or Ollama (configurable)
- **Desktop**: Electron for cross-platform app
- **Dev Tools**: Tilt for local development, pnpm workspaces
- **Deployment**: Docker Compose

See [TECH_STACK.md](./docs/TECH_STACK.md) for detailed rationale.

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
