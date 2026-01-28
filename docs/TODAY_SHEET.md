## Today Sheet – Feature Design Document

### 1. Context & Problem

High-level ICs and managers spend their day context switching across meetings, projects, and ad-hoc work. They:
- Capture ideas, tasks, and notes in Quick Capture
- Struggle to turn that stream of inputs into a **clear, realistic plan for the day**
- Lose track of what’s due today vs what’s just “nice-to-do”
- Rarely have time/energy to manually organize, prioritize, and schedule

**Opportunity**: Use AI + captured data to automatically generate a **“Today Sheet”**: a focused, actionable daily plan that fits into their real constraints and highlights what truly matters today.

---

### 2. Product Vision

**Today Sheet** is the **daily command center** that:
- Pulls in **Quick Capture items** and other inputs (calendar, tasks, deadlines)
- Uses AI to **clarify, de-duplicate, and prioritize**
- Presents a **single, coherent plan for today** – with must-do items up top and lower-urgency work clearly separated
- Iterates with the user throughout the day as reality changes

Success: A user can open the app once in the morning and say, “This tells me exactly what I should do today and in what order,” and then keep it mostly in sync with just a few taps.

---

### 3. Target Users

- **Primary**: Staff+ ICs, engineering managers, directors, product leads
  - Heavy context switching
  - Multiple projects and stakeholders
  - Mix of reactive work (Slack, tickets, meetings) and proactive work (deep-focus tasks)

- **Secondary**: Any knowledge worker with:
  - Many small/medium tasks
  - Frequent interrupts
  - Inconsistent planning discipline

---

### 4. Goals & Non-Goals

#### Goals

- **Turn unstructured capture into a structured daily plan**
- **Highlight urgency and importance**: items due today, overdue, and high-priority tasks
- **Make it actionable**: clear tasks, grouped and ordered with suggested time estimates
- **Support rapid iteration**: quick edits as the day changes (drag, snooze, re-generate)
- **Be low-friction**: one or two taps from “I captured something” to “it’s in today’s plan”

#### Non-Goals (initial release)

- Full project management/replacing Jira/Linear
- Long-term planning views (weekly/monthly roadmap)
- Deep timeboxing with calendar write-back (can be v2+)
- Complex team collaboration (shared sheets, approvals)

---

### 5. User Value & Key Scenarios

#### Scenario A – Morning Planning

1. User opens app at 8:30am.
2. Quick Capture already holds yesterday’s notes, ideas, tasks.
3. Today Sheet shows:
   - “Items due today”
   - “Important but no due date”
   - “Quick wins / <15 min”
   - Suggested ordering
4. AI proposes a **draft daily plan** (“Here’s a 6-hour plan based on your day”).
5. User tweaks order, removes a few, marks 2 items as “This week, not today”.
6. Hits “Lock in Today” – this becomes the reference plan.

**Value**: They get a plan that matches their bandwidth in <2 minutes.

#### Scenario B – Midday Replan after Fire Drill

1. At 1pm, unexpected production issue consumed the morning.
2. Today Sheet notices several “still open” items and time passed.
3. AI suggests:
   - A condensed plan for the remaining hours
   - Auto-snoozing lower-priority items to tomorrow/this week
4. User accepts most changes, promotes one item back to today.

**Value**: Quick re-plan without rethinking the whole day.

#### Scenario C – Drive-by Capture to Action

1. In a meeting, user Quick Captures: “Discuss Q3 infra budget with finance. Need final numbers by Friday.”
2. After the meeting, Today Sheet:
   - Extracts the actionable task
   - Detects due date (Friday) and context (Finance, Infra)
   - Places it under “This Week” until Friday, then surfaces it in “Today” that morning.

**Value**: Captures become automatically-timed, not lost in a pile.

---

### 6. Feature Overview

#### 6.1 Today Sheet: Core Sections

On the main screen, **below Quick Capture**, we display the Today Sheet with these sections (in order):

- **1) Must-Do Today**
  - Tasks due today or overdue
  - Critical tasks explicitly flagged as “must do”
  - Suggested 3–7 items max (to stay realistic)
- **2) Likely Today / High Leverage**
  - Important but not strictly due today
  - High impact or aligned with goals
- **3) Opportunistic / No Due Date**
  - Tasks with no due date or soft dates
  - Organized by “Quick wins” vs “Deep work”
- **4) Overflow / Parking Lot**
  - Items AI recommends for “later this week”
  - Visible but visually de-emphasized (collapsible)

Every item in these lists originates from:
- Quick Capture
- Existing tasks in the system (if present)
- Calendar events (for v2: meeting prep or follow-ups)

---

### 7. UX & UI Design

#### 7.1 Main Screen Layout

- **Top**: Quick Capture input (existing)
- **Below**: `Today Sheet` card / panel

Within the Today Sheet:

- **Header bar**
  - Title: `Today Sheet`
  - Subtitle: e.g. “5 tasks, ~4.5 hrs”
  - Actions:
    - “Re-generate plan”
    - “Expand all / Collapse all” (for sections)

- **Sections (Must-Do, Likely Today, Opportunistic, Overflow)**
  - Each section:
    - Title + count (e.g. “Must-Do Today (3)”)
    - Optional summary line from AI (“Focus on shipping PR #482 and infra RFC.”)
    - Collapsible body with task cards

- **Task card**
  - Title (concise, AI-trimmed)
  - Optional subline: context/source (e.g. “from Quick Capture, 08:47 in ‘1:1 with VP’ ”)
  - Metadata chips:
    - Due date (Today, Tomorrow, Overdue)
    - Estimated duration (e.g. “25 min”)
    - Tags (Project, People)
  - Quick controls:
    - Checkbox: mark done
    - “⋯” menu: edit, change section, set due date, snooze
    - Drag handle for reordering

#### 7.2 Interactions

- **Create Plan**
  - If user has never used Today Sheet or starts a new day:
    - State: “No plan yet. Generate a Today Sheet from your captures?”
    - CTA: “Generate Today Sheet”
    - Secondary: “Skip for now” (we don’t block usage)

- **Re-generate Plan**
  - User taps “Re-generate plan”
  - Modal:
    - “Re-generate for:
       - [x] Remaining day
       - [ ] Full day (ignore current progress)”
    - Confirm
  - Today Sheet updates ordering/sections **without** deleting completed tasks.

- **Edit Tasks**
  - Tap task: opens detail view
    - Full content from original Quick Capture
    - AI-suggested breakdown: “This might be 2 tasks… [Split]”
    - Fields: Title, Description, Due date, Priority, Tags, Time estimate

- **Snooze / Defer**
  - Long-press or ‘⋯’ → “Move to Tomorrow / Later this week / Someday”
  - Task leaves Today Sheet; still accessible via tasks view.

- **Real-time Updates**
  - New Quick Capture items:
    - Non-intrusive “+1 new capture – Add to Today Sheet?” toast
    - Auto-tag as “Unsorted” until accepted into the plan

#### 7.3 Empty, Loading, and Edge States

- **No captures yet**
  - “Your Today Sheet will appear here once you’ve captured some thoughts.”
  - CTA: “Try Quick Capture above to start.”

- **All tasks completed**
  - Confetti / subtle celebration
  - “You’ve cleared Today’s plan. Want suggestions from your backlog?”
  - CTA: “Fill with backlog items”

- **Overwhelmed day**
  - If AI detects total estimated time > working hours, Today Sheet:
    - Adds a notice: “Today is overbooked by ~3 hours. Here’s what to move.”
    - Auto-creates a “Move to later” suggestion list.

---

### 8. AI Behavior & Logic

#### 8.1 Input Signals

The AI planner uses:

- **Quick Capture items**
  - Raw text (notes, tasks, ideas)
  - Time captured
  - Metadata: source (meeting, email, manual), tags if any

- **Task metadata** (if tasks system exists)
  - Status (open/closed)
  - Due date and reminders
  - Priority labels

- **User preferences** (per user profile)
  - Typical working hours
  - Max tasks per day
  - Preference for deep work vs small tasks
  - “Meeting-heavy day” vs “Open day” (optional hook to calendar)

#### 8.2 Transformation Pipeline

1. **Extraction**
   - Identify which Quick Capture items are **actionable tasks** vs pure notes.
   - Extract one or more tasks per capture if needed.
   - Example:
     - Capture: “Need to align with Data team on new metrics before Friday release; also check error budget.”
     - Tasks:
       - “Schedule alignment meeting with Data team about new metrics”
       - “Review error budget before Friday release”

2. **Normalization**
   - Generate clear, concise task titles.
   - Attach description from original capture.
   - Estimate rough duration (“<15 min”, “30–60 min”, “>90 min”).
   - Attach due dates if mentioned or implied (e.g., “by Friday”).

3. **Prioritization**
   - Factors:
     - Due date (today, overdue > tomorrow > later)
     - Importance (inferred from language, tags, repeat references)
     - Estimated effort vs remaining available time
   - Output tiers:
     - Must-Do Today
     - Likely Today
     - Opportunistic
     - Overflow

4. **Planning**
   - For the **current time and remaining working hours**:
     - Ensure Must-Do Today fits in remaining time; if not, prompt user to de-scope.
     - Fill in Likely Today tasks until realistic capacity reached.
   - Provide a **short natural language summary** at top:
     - “Focus on finalizing RFC A, reviewing PRs for B, and preparing slide deck for C.”

5. **Continuous Adjustment**
   - When tasks are marked done:
     - Recalculate remaining plan; optionally suggest next best task.
   - When time passes:
     - If the user is behind (e.g., 60% of day elapsed, 80% of Must-Do not done):
       - Suggest an updated plan with fewer items.

---

### 9. Requirements

#### 9.1 Functional Requirements

- **FR1**: System can pull all Quick Capture items for the current day and recent days.
- **FR2**: AI can derive actionable tasks from Quick Capture content and attach metadata (title, description, due date, tags, estimate).
- **FR3**: System can create and display a Today Sheet composed of task cards in prioritized sections.
- **FR4**: User can:
  - Mark tasks complete
  - Reorder tasks via drag-and-drop
  - Edit task details (title, due date, estimate, tags)
  - Move tasks between sections
  - Snooze/defer tasks (Tomorrow, This Week, Someday)
- **FR5**: User can generate and re-generate their Today Sheet.
- **FR6**: Today Sheet updates when:
  - New Quick Capture items are added
  - Due dates are reached/changed
  - The user’s working hours or availability change
- **FR7**: Completed tasks remain visible (at least for that day) and are visually distinct.

#### 9.2 Non-Functional Requirements

- **NFR1**: Today Sheet should load in <500ms after data available; AI generation target <2s p95.
- **NFR2**: UI must be responsive and usable on desktop and tablet; mobile-friendly where applicable.
- **NFR3**: AI should be deterministic enough to avoid wildly different plans on minor changes (unless user explicitly re-generates).
- **NFR4**: Privacy: user content is handled according to our data policies; surfaced clearly in settings.

---

### 10. Success Metrics

- **Activation**
  - % of active users who generate a Today Sheet at least 3 days in their first 2 weeks.
- **Engagement**
  - Average number of tasks completed from Today Sheet per day.
  - % of days where user re-opens Today Sheet ≥ 2 times.
- **Planning Quality**
  - Self-reported NPS-like rating: “My Today Sheet reflected what I actually needed to do today.”
  - Reduction in “overbooked” days over time (AI better matching capacity).
- **Retention**
  - 4-week retention of users who use Today Sheet vs those who don’t.

---

### 11. Edge Cases & Constraints

- **Very few tasks / light day**
  - AI still generates a plan but suggests deep work / backlog mining.
- **Too many urgent tasks**
  - Clearly call out overload and recommend intentional deferral.
- **Messy or long Quick Capture entries**
  - AI may propose splits; we must allow user to accept/reject.
- **Time zones / irregular hours**
  - Today Sheet respects user’s configured working hours (or defaults) for “remaining time”.
- **Offline / AI failure**
  - Fallback: show raw tasks list grouped by due date.
  - A non-AI “basic Today view” should still exist.

---

### 12. Phased Rollout

#### Phase 1 – MVP (Internal / Beta)

- Static Today Sheet using AI:
  - Extract tasks from Quick Capture
  - Simple priority buckets (Today, Later)
  - Basic UI: list + checkboxes + manual edit
- No continuous adjustment; generate once per day.

#### Phase 2 – Smart Planning (Public Beta)

- Add:
  - Remaining-day-aware re-planning
  - Sections (Must-Do, Likely, Opportunistic)
  - Time estimation and capacity checks
  - Re-generate flows and snoozing

#### Phase 3 – Adaptive & Calendar-Aware

- Integrate calendar signals:
  - Meeting-heavy vs open days
  - Soft timeboxing suggestions
- More robust ML on:
  - User completion patterns
  - Automatic suggestion tuning over time

---

### 13. Open Questions

- **How opinionated** should we be about limiting Must-Do Today items (e.g., hard cap vs soft suggestion)?
- **Calendar integration scope** for v1: read-only vs read/write?
- **Collaboration**: should we support tasks that are clearly delegated to others, and how do they appear in Today Sheet?
- **History**: How much of previous days’ Today Sheets should be visible?

---

### 14. Summary

**Today Sheet** transforms fragmented captures into a **single, high-signal daily plan** tailored to context-switch-heavy users. It:
- Pulls from Quick Capture and other signals
- Uses AI to extract, prioritize, and schedule tasks
- Presents them in a clean, editable daily sheet that adapts throughout the day

