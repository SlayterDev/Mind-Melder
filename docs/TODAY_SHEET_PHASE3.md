# Today Sheet - Phase 3 Implementation (API Service & Routes)

**Goal**: Create backend service and API endpoints for Today Sheet generation

**Duration**: ~1 day

---

## Step 1: Create TodaySheetService

**File**: `/apps/api/src/services/today-sheet-service.ts` (NEW)

### Service Class Structure

```typescript
import type { Database } from 'database';
import type { LLMProvider } from 'llm';
import { CapturesRepository } from 'database/repositories/captures-repository';
import { TodosRepository } from 'database/repositories/todos-repository';
import { TemplatesRepository } from 'database/repositories/templates-repository';

export interface TodaySheet {
  summary: string;
  sections: {
    must_do_today: Todo[];
    likely_today: Todo[];
    opportunistic: Todo[];
    overflow: Todo[];
  };
  totalEstimatedMinutes: number;
  capturesProcessed: number;
  todosIncluded: number;
}

export class TodaySheetService {
  private capturesRepo: CapturesRepository;
  private todosRepo: TodosRepository;
  private templatesRepo: TemplatesRepository;

  constructor(
    private db: Database,
    private llmProvider: LLMProvider
  ) {
    this.capturesRepo = new CapturesRepository(db);
    this.todosRepo = new TodosRepository(db);
    this.templatesRepo = new TemplatesRepository(db);
  }

  async generateSheet(userId: string, templateId?: string): Promise<TodaySheet> {
    // 1. Gather inputs
    // 2. Get template
    // 3. Call LLM
    // 4. Clear existing sheet
    // 5. Create/update todos from AI result
    // 6. Mark captures as organized
    // 7. Return formatted result
  }

  async getSheet(userId: string): Promise<TodaySheet | null> {
    // Fetch todos in today sheet, group by section, calculate total time
  }
}
```

### Key Logic

**generateSheet():**
1. Fetch unorganized captures + pending todos
2. Get template (provided or first active)
3. Call `llmProvider.generateTodaySheet()`
4. Clear existing sheet: `removeFromTodaySheet()`
5. For each AI task item:
   - If source is existing todo: update it with sheet metadata
   - If source is capture: create new todo
   - Set section, order, timeEstimate, priorityScore, tags
6. Mark captures as organized
7. Return TodaySheet object

**getSheet():**
1. Call `todosRepo.findInTodaySheet(userId)`
2. Group by section (must_do_today, likely_today, etc.)
3. Calculate total time (quick=10, medium=45, long=90)
4. Return formatted result or null if empty

---

## Step 2: Create API Routes

**File**: `/apps/api/src/routes/today-sheet.ts` (NEW)

### Endpoints

**POST `/api/v1/today-sheet/generate`**
- Body: `{ templateId?: string }`
- Calls `todaySheetService.generateSheet()`
- Returns: `{ success: true, sheet: TodaySheet, message: string }`

**GET `/api/v1/today-sheet`**
- No params
- Calls `todaySheetService.getSheet()`
- Returns: `TodaySheet` or 404 if none exists

**PATCH `/api/v1/today-sheet/todos/:id`**
- Body: `{ content?, todaySheetSection?, todaySheetOrder?, timeEstimate?, tags?, status? }`
- Calls `todosRepo.update()`
- Returns: Updated `Todo`

**PATCH `/api/v1/today-sheet/reorder`**
- Body: `{ updates: [{ id, section, order }] }`
- Calls `todosRepo.updatePositions()`
- Returns: `{ success: true }`

### Validation Schemas (Zod)

```typescript
const generateSheetSchema = z.object({
  templateId: z.string().uuid().optional(),
});

const updateTodoSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  todaySheetSection: z.enum(['must_do_today', 'likely_today', 'opportunistic', 'overflow', 'none']).optional(),
  todaySheetOrder: z.number().int().optional(),
  timeEstimate: z.enum(['quick', 'medium', 'long', 'none']).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['pending', 'completed']).optional(),
});

const reorderSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    section: z.string(),
    order: z.number().int(),
  })),
});
```

---

## Step 3: Register Routes

**File**: `/apps/api/src/index.ts`

Add after existing routes:

```typescript
import { createTodaySheetRouter } from './routes/today-sheet';

// ... after other routes
app.use('/api/v1/today-sheet', createTodaySheetRouter(db, llmProvider));
```

**Note**: The `llmProvider` should already be created in index.ts from the existing organization feature.

---

## Step 4: Test with API Client

Create test script: `/apps/api/test-today-sheet-api.sh`

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "🧪 Testing Today Sheet API..."

# Test 1: Generate sheet
echo -e "\n1️⃣ POST /today-sheet/generate"
curl -s -X POST "$BASE_URL/today-sheet/generate" \
  -H "Content-Type: application/json" \
  | jq .

# Test 2: Get sheet
echo -e "\n2️⃣ GET /today-sheet"
curl -s "$BASE_URL/today-sheet" | jq .

# Test 3: Update todo (get first todo ID from sheet)
TODO_ID=$(curl -s "$BASE_URL/today-sheet" | jq -r '.sections.must_do_today[0].id')
echo -e "\n3️⃣ PATCH /today-sheet/todos/$TODO_ID"
curl -s -X PATCH "$BASE_URL/today-sheet/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' \
  | jq .

# Test 4: Reorder (example)
echo -e "\n4️⃣ PATCH /today-sheet/reorder"
curl -s -X PATCH "$BASE_URL/today-sheet/reorder" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {"id": "'$TODO_ID'", "section": "likely_today", "order": 0}
    ]
  }' \
  | jq .

echo -e "\n✅ Tests complete"
```

Make executable:
```bash
chmod +x apps/api/test-today-sheet-api.sh
```

---

## Verification Checklist

- [ ] TodaySheetService created in `/apps/api/src/services/today-sheet-service.ts`
- [ ] `generateSheet()` method implemented
- [ ] `getSheet()` method implemented
- [ ] Router created in `/apps/api/src/routes/today-sheet.ts`
- [ ] POST `/generate` endpoint with validation
- [ ] GET `/` endpoint
- [ ] PATCH `/todos/:id` endpoint
- [ ] PATCH `/reorder` endpoint
- [ ] Routes registered in `/apps/api/src/index.ts`
- [ ] API server starts without errors
- [ ] POST generate returns TodaySheet with sections
- [ ] GET returns existing sheet or 404
- [ ] PATCH todos/:id updates status/section/order
- [ ] PATCH reorder updates multiple todos
- [ ] Captures are marked as organized after generation
- [ ] Test script runs successfully

---

## Expected API Responses

### POST /today-sheet/generate

```json
{
  "success": true,
  "sheet": {
    "summary": "Focus on security PR and Q4 report.",
    "sections": {
      "must_do_today": [
        {
          "id": "uuid",
          "content": "Review security PR #482",
          "status": "pending",
          "todaySheetSection": "must_do_today",
          "todaySheetOrder": 0,
          "timeEstimate": "medium",
          "priorityScore": 95,
          "tags": ["security", "code-review"],
          "captureId": "uuid",
          "dueDate": "2026-01-28T00:00:00Z"
        }
      ],
      "likely_today": [...],
      "opportunistic": [...],
      "overflow": []
    },
    "totalEstimatedMinutes": 240,
    "capturesProcessed": 3,
    "todosIncluded": 1
  },
  "message": "Generated today's plan with 3 captures"
}
```

### GET /today-sheet

```json
{
  "summary": "",
  "sections": {
    "must_do_today": [...],
    "likely_today": [...],
    "opportunistic": [...],
    "overflow": []
  },
  "totalEstimatedMinutes": 240,
  "capturesProcessed": 0,
  "todosIncluded": 4
}
```

---

## Critical Files

1. `/apps/api/src/services/today-sheet-service.ts` - NEW service
2. `/apps/api/src/routes/today-sheet.ts` - NEW router
3. `/apps/api/src/index.ts` - Register routes

---

## Testing Strategy

**Manual Testing:**
1. Start API server: `pnpm dev`
2. Create some captures via POST `/api/v1/captures`
3. Generate sheet: POST `/api/v1/today-sheet/generate`
4. Verify captures are organized (organized_at is set)
5. Verify todos are created with correct sections
6. Get sheet: GET `/api/v1/today-sheet`
7. Update todo: PATCH `/api/v1/today-sheet/todos/:id`
8. Reorder: PATCH `/api/v1/today-sheet/reorder`

**Error Cases:**
- Generate with no active template → 400 error
- Generate with no captures → empty sheet
- Get sheet with no items → 404
- Update non-existent todo → 404

---

## Next Steps (Phase 4)

After Phase 3:
- Install frontend dependencies (@dnd-kit)
- Add todaySheetAPI client methods
- Create TodaySheetPage component
- Add drag-and-drop functionality
- Add navigation and routing
