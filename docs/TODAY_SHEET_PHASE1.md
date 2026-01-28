# Today Sheet - Phase 1 Implementation (Database & Repositories)

**Goal**: Set up database schema and repository methods to support Today Sheet items

**Duration**: ~1 day

---

## Step 1: Extend Todos Schema

**File**: `/packages/database/src/schema/todos.ts`

### Add Enums

```typescript
export const todaySheetSectionEnum = pgEnum('today_sheet_section', [
  'must_do_today',
  'likely_today',
  'opportunistic',
  'overflow',
  'none' // For regular todos not in today sheet
]);

export const timeEstimateEnum = pgEnum('time_estimate', [
  'quick',   // <15 min
  'medium',  // 30-60 min
  'long',    // >90 min
  'none'     // Not estimated
]);
```

### Add Fields to Todos Table

Add after line 13 (`userId: text('user_id').notNull(),`):

```typescript
// Today Sheet fields
todaySheetSection: todaySheetSectionEnum('today_sheet_section').default('none'),
todaySheetOrder: integer('today_sheet_order'),
timeEstimate: timeEstimateEnum('time_estimate').default('none'),
priorityScore: integer('priority_score'),
tags: jsonb('tags').$type<string[]>().default([]),
captureId: uuid('capture_id').references(() => captures.id, { onDelete: 'set null' }),
```

### Add Indexes

Add to indexes section (after line 20):

```typescript
todaySheetSectionIdx: index('todos_today_sheet_section_idx').on(table.todaySheetSection),
todaySheetOrderIdx: index('todos_today_sheet_order_idx').on(table.todaySheetOrder),
```

### Import Captures Schema

Add at top:

```typescript
import { captures } from './captures';
```

---

## Step 2: Extend TodosRepository

**File**: `/packages/database/src/repositories/todos-repository.ts`

### Add Imports

```typescript
import { asc, ne, inArray } from 'drizzle-orm';
```

### Add Methods (after `delete` method at line 60)

```typescript
/**
 * Get all todos in today's sheet, ordered by section and order
 */
async findInTodaySheet(userId: string): Promise<Todo[]> {
  return this.db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        ne(todos.todaySheetSection, 'none')
      )
    )
    .orderBy(asc(todos.todaySheetOrder));
}

/**
 * Bulk update positions for drag-and-drop
 */
async updatePositions(
  updates: Array<{ id: string; section: string; order: number }>
): Promise<void> {
  await this.db.transaction(async (tx) => {
    for (const update of updates) {
      await tx
        .update(todos)
        .set({
          todaySheetSection: update.section as any, // Type assertion for enum
          todaySheetOrder: update.order,
          updatedAt: new Date()
        })
        .where(eq(todos.id, update.id));
    }
  });
}

/**
 * Remove todos from today sheet (set section to 'none')
 */
async removeFromTodaySheet(ids: string[]): Promise<void> {
  await this.db
    .update(todos)
    .set({
      todaySheetSection: 'none' as any,
      todaySheetOrder: null,
      updatedAt: new Date()
    })
    .where(inArray(todos.id, ids));
}
```

---

## Step 3: Generate & Run Migration

```bash
# Generate migration from schema changes
pnpm db:generate

# This creates a new SQL file in packages/database/migrations/
# Review the SQL to ensure it's correct

# Run migration
pnpm db:migrate

# Verify in database
pnpm db:studio
```

---

## Step 4: Test Database Changes

**File**: `packages/database/test-today-sheet.ts` (create new test file)

```typescript
import { db } from './src/client';
import { TodosRepository } from './src/repositories/todos-repository';

async function testTodaySheetFields() {
  const todosRepo = new TodosRepository(db);

  // Test creating todo with today sheet fields
  const todo = await todosRepo.create({
    userId: 'test-user-1',
    content: 'Test today sheet item',
    todaySheetSection: 'must_do_today',
    todaySheetOrder: 0,
    timeEstimate: 'medium',
    priorityScore: 85,
    tags: ['urgent', 'code-review'],
  });

  console.log('Created todo:', todo);

  // Test findInTodaySheet
  const sheetTodos = await todosRepo.findInTodaySheet('test-user-1');
  console.log('Todos in sheet:', sheetTodos.length);

  // Test removeFromTodaySheet
  await todosRepo.removeFromTodaySheet([todo.id]);
  console.log('Removed from sheet');

  // Verify removed
  const afterRemove = await todosRepo.findInTodaySheet('test-user-1');
  console.log('Todos after remove:', afterRemove.length);

  // Cleanup
  await todosRepo.delete(todo.id);
  console.log('Test complete');
}

testTodaySheetFields().catch(console.error);
```

Run test:
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/capture" \
  pnpm --filter database tsx test-today-sheet.ts
```

---

## Verification Checklist

- [ ] Enums created (`today_sheet_section`, `time_estimate`)
- [ ] 6 new fields added to todos table
- [ ] 2 new indexes created
- [ ] Migration generated successfully
- [ ] Migration runs without errors
- [ ] Fields visible in Drizzle Studio
- [ ] `findInTodaySheet` returns todos with section != 'none'
- [ ] `updatePositions` updates multiple todos in transaction
- [ ] `removeFromTodaySheet` sets section to 'none'
- [ ] Test script runs successfully

---

## Expected Schema After Phase 1

**Todos table** should have these columns:
- id (uuid, primary key)
- content (text)
- status (enum: pending/completed)
- due_date (timestamp)
- completed_at (timestamp)
- user_id (text)
- **today_sheet_section** (enum) ← NEW
- **today_sheet_order** (integer) ← NEW
- **time_estimate** (enum) ← NEW
- **priority_score** (integer) ← NEW
- **tags** (jsonb) ← NEW
- **capture_id** (uuid, foreign key) ← NEW
- created_at (timestamp)
- updated_at (timestamp)

---

## Next Steps (Phase 2)

After Phase 1 is complete:
- Add LLM integration (`generateTodaySheet` method)
- Create TodaySheetService
- Build API endpoints
- Create frontend components

**Phase 1 sets the foundation** - all other phases depend on this schema being correct!
