# Implementation Plan: Slate.js Rich-Text Editor for Mind-Melder Notes

## Overview

Integrate Slate.js as the rich-text editor for organized notes, adding support for bold, italic, headings, lists, code blocks, and an embedded **task-card** void element that links live to existing todos. Legacy notes stored as plain markdown continue to render correctly via `react-markdown`. New notes and edits save content as a serialized Slate JSON document string.

---

## Phase 1: Package Installation

Add to `apps/web/package.json`:

```
slate          ^0.103.0   - core editor engine
slate-react    ^0.103.0   - React bindings (Editable, Slate, ReactEditor)
slate-history  ^0.103.0   - undo/redo plugin
```

Both `slate` and `slate-react` ship their own TypeScript declarations — no `@types/*` packages needed.

**Command:**
```bash
pnpm --filter @mind-melder/web add slate slate-react slate-history
```

No serialization helper library is needed. Content is stored as `JSON.stringify(Descendant[])`. A small internal `slateSerializer.ts` handles round-tripping and plain-text extraction for list previews.

---

## Phase 2: Schema Changes

**File:** `packages/database/src/schema/organized-notes.ts`

Add a `pgEnum` and a new column:

```typescript
export const contentFormatEnum = pgEnum('content_format', ['markdown', 'slate_json']);

// Inside organizedNotes table definition, add:
contentFormat: contentFormatEnum('content_format').default('markdown').notNull(),
```

The existing `content text NOT NULL` column is unchanged. For `slate_json` notes it stores the JSON string; for `markdown` notes it stores the raw markdown string as today.

All existing rows automatically receive `content_format = 'markdown'` — no data migration needed.

---

## Phase 3: Drizzle Migration

After editing the schema:

```bash
pnpm db:generate   # generates 0019_add_content_format.sql (or similar)
pnpm db:migrate    # applies it
```

Expected SQL:

```sql
DO $$ BEGIN
  CREATE TYPE "content_format" AS ENUM('markdown', 'slate_json');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "organized_notes"
  ADD COLUMN "content_format" "content_format" DEFAULT 'markdown' NOT NULL;
```

Verify in Drizzle Studio that all existing notes show `content_format = 'markdown'`.

---

## Phase 4: Validation & API Updates

### `packages/types/src/validation.ts`

```typescript
export const contentFormatSchema = z.enum(['markdown', 'slate_json']);
export type ContentFormat = z.infer<typeof contentFormatSchema>;

// Extend createOrganizedNoteSchema:
contentFormat: contentFormatSchema.default('markdown'),
content: z.string().min(1).max(500_000),  // raised from 50k — Slate JSON is verbose

// Extend updateOrganizedNoteSchema:
contentFormat: contentFormatSchema.optional(),
content: z.string().min(1).max(500_000).optional(),
```

### `apps/api/src/routes/notes.ts`

Destructure and forward `contentFormat` in `POST /` and `PATCH /:id` handlers.

### `apps/web/src/api/client.ts`

Add `contentFormat?: ContentFormat` to `notesAPI.create` and `notesAPI.update` type signatures.

---

## Phase 5: Editor Component Tree

New directory: `apps/web/src/components/editor/`

```
editor/
  types.ts             - Slate CustomElement / CustomText types + module augmentation
  slateSerializer.ts   - serialize, deserialize, slateToPlainText helpers
  editorHelpers.ts     - toggleMark, toggleBlock, isMarkActive, isBlockActive
  SlateToolbar.tsx     - formatting toolbar (Bold, Italic, Code, H1, H2, BulletList, NumberedList)
  SlateLeaf.tsx        - renders text marks (bold → <strong>, italic → <em>, code → <code>)
  SlateElement.tsx     - renders block elements; dispatches task-card to TaskCardVoid
  TaskCardVoid.tsx     - void element that fetches & renders a live todo card inline
  CommandPalette.tsx   - slash `/` command palette for searching and inserting todos
  SlateEditor.tsx      - main component, assembles all of the above
```

### `types.ts` — Custom element types

```typescript
export type ParagraphElement    = { type: 'paragraph';       children: CustomText[] };
export type HeadingOneElement   = { type: 'heading-one';     children: CustomText[] };
export type HeadingTwoElement   = { type: 'heading-two';     children: CustomText[] };
export type BulletedListElement = { type: 'bulleted-list';   children: ListItemElement[] };
export type NumberedListElement = { type: 'numbered-list';   children: ListItemElement[] };
export type ListItemElement     = { type: 'list-item';       children: CustomText[] };
export type CodeBlockElement    = { type: 'code-block';      children: CustomText[] };
export type TaskCardElement     = {
  type: 'task-card';
  todoId: string;
  children: [{ text: '' }];   // void element requires one empty text child
};
export type CustomText = { text: string; bold?: true; italic?: true; code?: true };
```

### `slateSerializer.ts` — Persistence helpers

```typescript
export const EMPTY_SLATE_DOCUMENT: Descendant[] = [{ type: 'paragraph', children: [{ text: '' }] }];

export function serializeToString(value: Descendant[]): string {
  return JSON.stringify(value);
}
export function deserializeFromString(raw: string): Descendant[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as Descendant[];
  } catch { /* fall through */ }
  return EMPTY_SLATE_DOCUMENT;
}
// Extracts plain text for list/preview rendering of slate_json notes
export function slateToPlainText(value: Descendant[]): string { ... }
```

### `SlateEditor.tsx` — Main component

```typescript
interface SlateEditorProps {
  value: Descendant[];
  onChange: (value: Descendant[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}
```

- Creates `editor` with `withTaskCards(withHistory(withReact(createEditor())))`.
- `withTaskCards` plugin marks `task-card` as a void element.
- Renders `<Slate>` → `<SlateToolbar>` (hidden when `readOnly`) → `<Editable>`.
- `onKeyDown` handles hotkeys (no extra library needed):
  - `Mod+B` → toggle bold
  - `Mod+I` → toggle italic
  - Mod+\` → toggle inline code
  - `/` at start of empty paragraph → open `CommandPalette`

---

## Phase 6: Task Card Embedding

### `TaskCardVoid.tsx`

- Receives `element: TaskCardElement` from Slate's `renderElement`.
- `useEffect` calls `todosAPI.get(element.todoId)` to load live todo data.
- Renders a compact read-only card: status indicator, content text, due date badge, time estimate chip.
- Small ✕ button calls `Transforms.removeNodes` to delete the embedding.
- Handles 404 gracefully: renders muted "Todo not found (deleted)" placeholder.
- Must render `{children}` with `contentEditable={false}` per Slate void requirements.

### `CommandPalette.tsx`

Triggered by typing `/` at the start of an empty paragraph.

- Loads `todosAPI.list('pending')` on mount.
- Filters by typed query after `/`.
- On selection: deletes the `/` character, inserts `{ type: 'task-card', todoId, children: [{ text: '' }] }`, closes palette.
- Keyboard: `↑`/`↓` to navigate, `Enter` to select, `Escape` to cancel.
- Positioned absolutely below the cursor using `ReactEditor.toDOMNode`.
- Styled with existing dark card classes: `bg-gray-900 border border-gray-700 rounded-xl shadow-2xl`.

A secondary **"Insert Task"** button in `SlateToolbar.tsx` opens the palette at cursor as an alternative entry point.

---

## Phase 7: NoteForm and Page Updates

### `apps/web/src/components/NoteForm.tsx`

Updated props:
```typescript
interface NoteFormProps {
  initialTitle?: string;
  initialContent?: string;           // legacy: markdown string
  initialSlateValue?: Descendant[];  // new: pre-parsed Slate document
  initialContentFormat?: 'markdown' | 'slate_json';
  initialTags?: string[];
  onSubmit: (data: {
    title: string;
    content: string;
    contentFormat: 'markdown' | 'slate_json';
    tags?: string[];
  }) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}
```

- Replace the `<textarea>` with `<SlateEditor value={editorValue} onChange={setEditorValue} />`.
- When `initialContentFormat === 'markdown'` and `initialContent` is provided (editing a legacy note), load the markdown string as a single paragraph node — this transparently upgrades the note to `slate_json` on next save.
- `handleSubmit` serializes: `content = serializeToString(editorValue)`, emits `contentFormat: 'slate_json'`.
- Empty check: `slateToPlainText(editorValue).trim().length === 0` replaces `!content.trim()`.

### `apps/web/src/pages/NoteDetailPage.tsx`

View mode branches on `contentFormat`:
```tsx
{note.contentFormat === 'slate_json' ? (
  <SlateEditor value={deserializeFromString(note.content)} onChange={() => {}} readOnly />
) : (
  <div className="prose prose-invert prose-lg max-w-none">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
  </div>
)}
```

Edit form passes `initialSlateValue` and `initialContentFormat`. `handleUpdate` signature widens to accept `contentFormat`.

### `apps/web/src/pages/NotesPage.tsx`

List preview uses `slateToPlainText` for `slate_json` notes to avoid showing raw JSON:
```tsx
{note.contentFormat === 'slate_json'
  ? slateToPlainText(deserializeFromString(note.content))
  : note.content}
```

---

## Implementation Sequence

| Step | What |
|------|------|
| 1 | Install packages |
| 2 | Schema: add `contentFormatEnum` + column |
| 3 | Run `db:generate` + `db:migrate` |
| 4 | Update Zod schemas + raise content limit |
| 5 | Update API route handlers |
| 6 | Update `client.ts` type signatures |
| 7 | Build `editor/` component tree (types → serializer → helpers → Leaf → Element → Toolbar → SlateEditor) |
| 8 | Build `TaskCardVoid` + `CommandPalette` |
| 9 | Update `NoteForm`, `NoteDetailPage`, `NewNotePage`, `NotesPage` |
| 10 | Manual smoke test |

---

## Trade-offs & Risks

| Risk | Notes |
|------|-------|
| **Search vector noise** | `search_vector` generated column will index JSON structural keywords for `slate_json` notes. Meaningful content still matches; quality slightly degrades. Future fix: store a `content_plain` column updated by the API. |
| **LLM-generated notes stay markdown** | The organize and refine flows return markdown strings → `contentFormat = 'markdown'`. Mixed formats in the list are handled by branching at render time. First manual edit upgrades to `slate_json`. |
| **Stale task-card references** | Deleted todos leave orphaned `todoId` refs in notes. `TaskCardVoid` renders a graceful "deleted" placeholder — no auto-cleanup. |
| **Slate pre-1.0 API instability** | Pin to exact version. All Slate logic is isolated behind the `editor/` directory boundary so upgrades only touch those files. |
| **Content size limit** | Raised from 50k to 500k characters. A note with ~20 embedded task cards + formatting serializes to well over 50k JSON characters. PostgreSQL `text` is unbounded. |
