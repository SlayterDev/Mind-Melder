# PROJECT_SPEC.md

# Quick Capture & AI Organizer

## Big Idea

An always-accessible productivity tool that lets you rapidly capture scattered thoughts and tasks throughout the day, then uses LLM summarization to transform raw inputs into structured, actionable notes and todo lists based on your personal organizational style.

---

## Core Brief

**Target** → Busy professionals and knowledge workers who need to capture thoughts quickly without context-switching

**Pain** → Raw notes pile up in disorganized text files or apps, making it hard to extract actionable tasks or find important information later

**Outcome** → A frictionless capture system that intelligently organizes inputs into clean notes and todos on-demand, adapting to personal workflow templates

---

## Layout

**Top** – Quick capture bar (always visible, keyboard shortcut accessible) with timestamp and optional tags

**Left Sidebar** – Navigation: Inbox (raw captures), Organized Notes, Todo List, Templates, Settings

**Main Panel** – Context-dependent view:
- Inbox: Chronological list of unprocessed captures
- Organized: Structured notes grouped by date/topic
- Todos: Actionable task list with checkboxes
- Templates: User-defined organization prompts

**Bottom Toolbar** – "Organize Now" button, sync status indicator, AI model selector

---

## Vibe Flows

### Quick Capture Flow
User hits keyboard shortcut (Cmd/Ctrl+Shift+N) → Overlay input appears → Type note/task → Hit Enter → Saved to Inbox → Overlay closes

### Manual Organization Flow
User clicks "Organize Now" → System batches Inbox items → Sends to LLM with active template → LLM returns structured output → Items move to Organized Notes + Todo List → Show summary toast

### Scheduled Organization Flow
Cron job triggers at configured time → Auto-batch unprocessed captures → Run LLM organization → Update views → Send notification with summary

### Template Creation Flow
User navigates to Templates → Clicks "New Template" → Writes custom prompt (e.g., "Separate by project, prioritize by urgency") → Save → Template appears in dropdown

### Todo Completion Flow
User checks task → Task marked complete with timestamp → Optionally archives after 7 days → Update completion stats

### Export Flow
User selects date range → Clicks "Export" → Generate Markdown file → Auto-download

---

## Style

Clean, distraction-free interface. Monospace font for raw captures, sans-serif for organized views.

Inspired by Linear + Obsidian: fast keyboard navigation, subtle animations on state changes, high-contrast text.

Neutral palette (charcoal, off-white, accent blue for CTAs). Dark mode default with light mode toggle.

Minimal chrome—focus stays on content. Smooth transitions between Inbox and organized states.

---

## Data • Storage

**PostgreSQL/SQLite** – Store raw captures (timestamp, content, metadata), organized notes, todos (status, due dates), user templates

**LocalStorage** – Cache keyboard shortcut preferences, last-used template, theme preference, AI model selection

**File System (optional)** – Export organized notes as Markdown for backup/portability

---

## Data • Services

**LLM API (flexible)** – OpenAI, Anthropic, or Ollama for summarization and organization. User configurable via settings.

**Cron/Scheduler** – Built-in task scheduler for automatic organization at user-defined intervals (end of day, twice daily, etc.)

**Optional: Notion/Obsidian Sync** – Export organized notes to external tools for long-term storage

**Optional: Email/SMS Gateway** – Allow note capture via forwarding (future enhancement)

---

## Optional • AI

- **Batch Summarization**: Take 10-50 raw captures and organize into categories (tasks, reference notes, ideas, follow-ups)
- **Template-Driven Organization**: Use user-defined templates to customize output structure (e.g., "Group by project and urgency" vs. "Separate personal/work/learning")
- **Smart Task Extraction**: Identify action items from natural language (e.g., "remind me to call Sarah" → Todo: "Call Sarah")
- **Auto-Tagging**: Suggest tags/categories based on content patterns
- **Weekly Digest**: Generate summary of completed tasks and recurring themes from the week
- **Context Preservation**: Maintain thread when related captures reference the same topic

---

## Scaffold Instructions

Use a modular monorepo structure separating backend API, web UI, and optional Electron wrapper.

**Backend**: RESTful API with clear endpoints for captures, organization, templates. Keep LLM provider abstracted behind an interface for easy swapping.

**Frontend**: React/Vue with global keyboard listener for quick capture. Component library for reusable UI (capture input, note cards, todo items).

**Deployment Options**:
- Self-hosted: Docker Compose with PostgreSQL + API + web server
- Marketable: Add auth layer (Clerk/Supabase Auth), multi-tenancy, and deploy API + web to Vercel/Fly.io

Design for extensibility (new LLM providers, export formats, capture methods).

---

## Technical Constraints

1. **Database**: Support both PostgreSQL (production) and SQLite (local development)
2. **LLM Providers**: Abstract provider interface to support OpenAI, Anthropic, Ollama, and future additions
3. **Deployment**: Docker Compose for self-hosting with environment-based configuration
4. **Frontend**: Single-page application with keyboard-first navigation
5. **Security**: Design schema for multi-tenancy even if launching single-user
6. **Export**: Markdown format for maximum portability

---

## Out of Scope (Initial Release)

- Real-time collaboration or sync
- Mobile native apps (web responsive is sufficient)
- Voice input or transcription
- Integration with external calendar/task systems
- Analytics or usage tracking
- User authentication (single-user mode initially)
- Advanced search or full-text indexing
