# Template Suggestions UI Mockup

## Visual Layout

The Template Improvements section appears on the Weekly Review page, after the Recommendations section.

## State 1: Initial State (Before Getting Suggestions)

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 Template Improvements                    [ Get Suggestions ]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Get AI-powered suggestions to improve your organization            │
│  template based on this week's review insights.                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State 2: Loading State

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 Template Improvements          [ ⟳ Generating... ]             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Loading spinner animation]                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State 3: Suggestions Displayed (Collapsed)

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 Template Improvements                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #1  Add Priority Scoring Criteria                      ▼    │  │
│  │     The current template doesn't specify how to              │  │
│  │     determine priority. Adding clear criteria for            │  │
│  │     scoring will help ensure critical tasks are              │  │
│  │     identified correctly.                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #2  Include Context Extraction Guidelines             ▼    │  │
│  │     Missing guidance on extracting key context like          │  │
│  │     people mentioned, deadlines, or project names.           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #3  Enhance Time Estimation Guidance                  ▼    │  │
│  │     Based on your weekly review, 45% of tasks took           │  │
│  │     longer than estimated. Adding more detailed time         │  │
│  │     estimation criteria will improve planning accuracy.      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Hide Suggestions                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State 4: Suggestion Expanded (Showing Improved Prompt)

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 Template Improvements                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #1  Add Priority Scoring Criteria                      ▲    │  │
│  │     The current template doesn't specify how to              │  │
│  │     determine priority. Adding clear criteria for            │  │
│  │     scoring will help ensure critical tasks are              │  │
│  │     identified correctly.                                    │  │
│  │                                                               │  │
│  │ ─────────────────────────────────────────────────────────── │  │
│  │ IMPROVED TEMPLATE PROMPT                                     │  │
│  │                                                               │  │
│  │ ┌─────────────────────────────────────────────────────────┐ │  │
│  │ │ Extract actionable tasks from captures.                 │ │  │
│  │ │                                                          │ │  │
│  │ │ For each task, assign a priority score (0-100) based   │ │  │
│  │ │ on:                                                      │ │  │
│  │ │ - Urgency: Is there a deadline or time-sensitive       │ │  │
│  │ │   aspect? (40 points)                                   │ │  │
│  │ │ - Impact: How important is this task to overall        │ │  │
│  │ │   goals? (40 points)                                    │ │  │
│  │ │ - Dependencies: Do other tasks depend on this?         │ │  │
│  │ │   (20 points)                                           │ │  │
│  │ │                                                          │ │  │
│  │ │ Use 80-100 for critical/urgent, 50-79 for important,   │ │  │
│  │ │ 20-49 for nice-to-have, 0-19 for low-priority.         │ │  │
│  │ │                                                          │ │  │
│  │ │ Be concise and specific in task descriptions.           │ │  │
│  │ └─────────────────────────────────────────────────────────┘ │  │
│  │                                                               │  │
│  │ [ ✓ Apply This Suggestion ]                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Other suggestions collapsed...]                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State 5: Applying Suggestion

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 Template Improvements                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ #1  Add Priority Scoring Criteria                      ▲    │  │
│  │     [Suggestion details...]                                  │  │
│  │                                                               │  │
│  │ [ ⟳ Applying... ]                                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## State 6: Success (After Applying)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ✅ Weekly review generated successfully!                           │
├─────────────────────────────────────────────────────────────────────┐
```

## Color Scheme

- **Primary Background**: Dark gray (#1F2937)
- **Card Background**: Slightly lighter gray with transparency
- **Suggestion Cards**: Yellow tint (rgb(234 179 8 / 0.05))
- **Borders**: Yellow with transparency (rgb(234 179 8 / 0.2))
- **Icons**: 
  - 💡 Lightbulb: Yellow (#FBBF24)
  - ✓ Checkmark: Green for success
  - ⟳ Spinner: Animated accent color
- **Text**:
  - Titles: Light gray (#F3F4F6)
  - Descriptions: Medium gray (#9CA3AF)
  - Code blocks: Monospace, lighter gray

## Interactive Elements

1. **Get Suggestions Button**
   - Accent color background
   - Sparkles icon (✨)
   - Disabled state while loading
   - Shows spinner when active

2. **Suggestion Cards**
   - Hover effect: Slightly lighter background
   - Click to expand/collapse
   - Chevron icon indicates state (▼/▲)

3. **Apply Button**
   - Full width within expanded card
   - Checkmark icon (✓)
   - Loading state with spinner
   - Success flash on completion

4. **Hide Suggestions Link**
   - Text link at bottom
   - Subtle gray color
   - Hover effect

## Accessibility

- Keyboard navigation supported
- Screen reader friendly labels
- Color contrast meets WCAG AA standards
- Loading states announced to screen readers
- Button states clearly indicated

## Responsive Design

- **Desktop**: Full width cards with comfortable padding
- **Mobile**: Stacked layout, full width buttons
- **Tablet**: Medium padding, optimized for touch
