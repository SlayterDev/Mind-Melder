# Agent Architecture Plan

## Mind Melder — Milestone 2

-----

## Overview

The agentic layer transforms Mind Melder from a request/response tool into a system that observes, reasons, and acts on the user’s behalf. Rather than waiting for the user to trigger organization, the agent runs continuously — watching for captures, detecting patterns, and proposing actions that the user can accept, reject, or redirect.

This document defines the architecture for building that agent on top of the existing Electron + React + Express + PostgreSQL stack.

-----

## Core Principle: Act, Don’t Execute

The agent never writes directly to user-facing data. Every proposed action is queued for user approval first. This keeps the user in control, builds trust incrementally, and — critically — turns every interaction into a feedback signal that improves future agent behavior.

-----

## 1. New Architectural Component: Agent Service

### What It Is

A persistent background worker that runs alongside the Express API. It boots with the application, listens for triggers, and runs reasoning loops independently of user requests.

### Where It Lives

Two viable options depending on preference:

- **Embedded in `apps/api`** — Agent runs as a module within the existing Express process. Simpler to start, shares DB connection and LLM client directly. Recommended for Milestone 2.
- **Separate `apps/agent` package** — Own Node process in the monorepo. Cleaner separation, independently deployable. Better long-term but adds coordination overhead now.

### Responsibilities

1. **Observe** — watch for triggers (new captures, scheduled times, pattern thresholds)
2. **Reason** — call the LLM with focused context to decide what actions to take
3. **Queue** — write proposed actions to `agent_actions` table for user approval
4. **Learn** — store feedback outcomes to improve future reasoning

-----

## 2. The Action Queue

The action queue is the most critical new primitive in the system. It is the boundary between agent reasoning and real user data.

### `agent_actions` Table Schema

> **Implementation note**: The project uses Drizzle ORM. All discriminated text fields (`trigger_type`, `action_type`, `status`) must be defined as `pgEnum` in the schema file — not plain `TEXT`. All tables include a `user_id` column for multi-tenancy consistency with the rest of the schema.

```sql
CREATE TABLE agent_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,         -- required for multi-tenancy (matches all other tables)
  trigger_type    TEXT NOT NULL,         -- pgEnum: 'capture' | 'scheduled' | 'threshold'
  trigger_ref     UUID,                  -- reference to the capture or task that triggered this
  action_type     TEXT NOT NULL,         -- pgEnum: 'create_task' | 'assign_due_date' | 'flag_followup' | 'detect_overcommitment' | 'suggest_defer'
  action_payload  JSONB NOT NULL,        -- the proposed action data
  confidence      REAL NOT NULL,         -- 0.0–1.0, agent's self-assessed confidence
  reason          TEXT NOT NULL,         -- human-readable explanation shown in approval tray
  status          TEXT NOT NULL DEFAULT 'pending',  -- pgEnum: 'pending' | 'accepted' | 'rejected' | 'redirected' | 'expired'
  user_correction JSONB,                 -- populated on 'redirected' — what the user changed
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);
```

### `agent_feedback` Table Schema

```sql
CREATE TABLE agent_feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,         -- required for multi-tenancy
  action_id        UUID REFERENCES agent_actions(id),
  outcome          TEXT NOT NULL,         -- pgEnum: 'accepted' | 'rejected' | 'redirected'
  original_action  JSONB NOT NULL,
  corrected_action JSONB,                 -- populated on redirect
  captured_at      TIMESTAMPTZ DEFAULT now()
);
```

The feedback table is what makes the agent smarter over time. Acceptance rates, rejection patterns, and redirect diffs are the raw material for tuning prompts and eventually building user-specific heuristics.

### Action Lifecycle

```
New Capture / Schedule / Threshold
        ↓
  Agent reasons (LLM tool call)
        ↓
  agent_actions row created (status: pending)
        ↓
  Approval tray surfaces to user
        ↓
  ┌─────────────────────────────────┐
  │ Accept  → execute action        │
  │           → feedback: accepted  │
  │                                 │
  │ Reject  → no-op                 │
  │           → feedback: rejected  │
  │                                 │
  │ Redirect → execute amended      │
  │            → feedback: redirect │
  └─────────────────────────────────┘
```

-----

## 3. Trigger Architecture

The agent wakes up via three trigger types, each with a different latency profile and reasoning depth.

### Trigger 1 — Capture Trigger

**When**: Immediately when a new item lands in the inbox.

**What it does**: Processes the new capture in context of recent activity and decides if any immediate actions are warranted — task extraction, due date detection, follow-up flagging.

**Design constraints**: Latency-sensitive. The user just captured something and may still be at their keyboard. Keep the prompt focused and the tool vocabulary narrow. This is not the time for heavy multi-step reasoning.

**Implementation**: POST to `/api/v1/captures` already exists. After the capture is saved, emit an internal event (`captures:new`) that the agent service subscribes to.

-----

### Trigger 2 — Scheduled Trigger

**When**: On a cron schedule — configurable by user, defaulting to morning (8am) and end-of-day (5pm).

**What it does**: Heavier reasoning pass. Today Sheet generation or refresh, overcommitment detection across the full day’s task load, weekly digest generation (Friday EOD).

**Design constraints**: User is not waiting on a response. Afford a more thorough prompt, more context pulled in, multi-step tool calls. Output may be multiple queued actions from a single run.

**Implementation**: Use `node-cron` or a lightweight scheduler within the agent service. Respect user’s configured working hours from their preferences.

-----

### Trigger 3 — Threshold Trigger

**When**: When a monitored condition crosses a defined threshold.

**Examples**:

- A topic appears in 5+ captures without a corresponding task created
- A flagged follow-up has been sitting unresolved for 3+ days
- Estimated time for today’s tasks exceeds available working hours by >30%
- A capture references a person’s name 3+ times across different sessions

**Why it matters**: These feel the most “magical” to users — the agent noticed something they didn’t explicitly ask about. They emerge from pattern recognition, not from a user action or a clock.

**Implementation**: A background polling loop that runs every N minutes, evaluating threshold conditions against current DB state. Conditions are defined as query + threshold pairs, easy to add new ones over time.

-----

## 4. LLM Interaction Pattern

Rather than one large “figure everything out” prompt, the agent uses a series of small, focused tool-calling interactions. This is a deliberate extension of the chat interface pattern already built in Milestone 1.

### Reasoning Loop

```
Trigger fires
     ↓
Build context package
  - Recent captures (last N hours or since last run)
  - Existing open tasks
  - User preferences (working hours, max tasks/day)
  - Recent feedback patterns (what has the user accepted/rejected)
     ↓
Call LLM with tool definitions
     ↓
LLM selects tools and arguments
     ↓
Tool calls → agent_actions rows (not direct DB writes)
     ↓
Pending actions surfaced to user
```

### Available Agent Tools (Milestone 2)

|Tool                   |Description                                           |Action Type            |
|-----------------------|------------------------------------------------------|-----------------------|
|`create_task`          |Extract and create a task from a capture              |`create_task`          |
|`assign_due_date`      |Attach a due date inferred from capture language      |`assign_due_date`      |
|`flag_followup`        |Mark a capture as a follow-up requiring future action |`flag_followup`        |
|`detect_overcommitment`|Surface a warning when today’s load exceeds capacity  |`detect_overcommitment`|
|`suggest_defer`        |Recommend moving a task to tomorrow or later this week|`suggest_defer`        |

Start with this narrow vocabulary. Expand only after acceptance rates are healthy.

### System Prompt Strategy

The agent’s system prompt has three layers:

1. **Persona** — “You are a focused productivity agent. Your job is to reduce cognitive overhead, not add to it. Only surface actions you are confident about.”
2. **Context** — injected at runtime: recent captures, open tasks, user patterns, current time and working hours remaining.
3. **Constraints** — “Prefer no action over a low-confidence action. When uncertain, do not queue. A confidence score below 0.7 should not result in a queued action.”

-----

## 5. Approval Tray (Frontend)

The approval tray is the user-facing surface for all pending agent actions. It must be non-blocking, low-friction, and dismissible.

### Data Flow

The React frontend subscribes to pending actions via SSE (same pattern as streaming chat responses). When the agent writes a new `pending` row to `agent_actions`, the SSE stream pushes it to the renderer.

New API endpoints required:

```
GET  /api/v1/agent/actions?status=pending     — fetch pending actions
POST /api/v1/agent/actions/:id/accept         — accept and execute
POST /api/v1/agent/actions/:id/reject         — reject, record feedback
POST /api/v1/agent/actions/:id/redirect       — amend and execute, record correction
GET  /api/v1/agent/actions/stream             — SSE stream for real-time updates
```

### Tray UX Principles

- Tray badge shows count of pending actions; zero state is invisible
- Each action card shows: proposed action, the reason the agent surfaced it, confidence indicator
- Accept is one tap; reject is one tap; redirect opens a minimal edit view
- Actions older than 24 hours without resolution are auto-expired (not auto-executed)
- Never block the user’s primary workflow — the tray is ambient, not modal

### Electron Integration

The Electron main process observes pending action count via IPC and can show a native badge or subtle notification when new actions arrive. This uses the same IPC pattern established for the quick-capture hotkey — no new Electron-level architecture required.

-----

## 6. Confidence Threshold Management

Agent fatigue is the primary risk. If the tray fills with low-quality suggestions, users stop engaging with it and the system loses its value.

### Strategy

- **Ship with a high threshold** — only queue actions with confidence ≥ 0.75 at launch
- **Track acceptance rate** — if rate drops below 60% over a rolling 7-day window, automatically raise the threshold
- **Expand vocabulary gradually** — don’t add new action types until existing ones are performing well
- **Surface confidence to the user** — a subtle indicator on each action card builds trust and sets appropriate expectations

### Feedback Loop

As the `agent_feedback` table accumulates data, use it to:

1. Identify which action types have low acceptance — consider removing or tightening them
2. Identify redirect patterns — if users consistently correct a particular field, adjust the prompt
3. Build user-specific prompt context — “this user tends to reject defer suggestions; only surface them for items >7 days old”

-----

## 7. How It Fits the Existing Stack

|Layer             |Change Required                                                                |
|------------------|-------------------------------------------------------------------------------|
|**PostgreSQL**    |Add `agent_actions` and `agent_feedback` tables                                |
|**Express API**   |Add agent action endpoints + SSE stream; emit `captures:new` events internally |
|**Agent Service** |New module within `apps/api` — trigger listeners, scheduler, LLM reasoning loop|
|**React Frontend**|Add approval tray component; subscribe to SSE action stream                    |
|**Electron Main** |Add IPC handler for pending action badge count; optional native notification   |
|**LLM Client**    |Reuse existing abstracted provider interface; agent uses same client as chat   |

No changes required to the Vite build, preload scripts, or quick-capture window.

-----

## 8. Phased Implementation

### Phase A — Foundation

- `agent_actions` and `agent_feedback` tables
- Agent service scaffolding with capture trigger
- `create_task` tool only (narrowest possible scope)
- Approval tray UI (accept/reject, no redirect yet)
- SSE stream for real-time tray updates

### Phase B — Scheduled Intelligence

- Scheduled trigger with cron
- Today Sheet generation as an agent action
- `assign_due_date` and `flag_followup` tools
- Redirect flow in approval tray
- Confidence threshold monitoring

### Phase C — Pattern Recognition

- Threshold trigger with configurable conditions
- `detect_overcommitment` and `suggest_defer` tools
- Feedback loop informing prompt context
- Electron badge and native notification integration
- User preference controls (threshold sensitivity, action type toggles)

-----

## 9. Open Questions

- **Scheduler persistence** — if the app is closed when a scheduled trigger should fire, does it run on next open, skip, or require the app to stay running? Define behavior before Phase B.
- **Context window limits** — how many captures and tasks to include in the context package before hitting token limits? Define a windowing strategy early.
- **Multi-action runs** — when a scheduled trigger produces 8 pending actions at once, how does the tray handle the flood? Consider batching or prioritizing by confidence.
- **Feedback data ownership** — is feedback used only for prompt tuning locally, or does it inform a shared model? Define the data policy before shipping.

-----

*Mind Melder — Agent Architecture Plan — Milestone 2*
