# Today Sheet - Phase 2 Implementation (LLM Integration)

**Goal**: Add AI capability to generate Today Sheet from captures and todos

**Duration**: ~1-2 days

---

## Step 1: Add Types to LLM Package

**File**: `/packages/llm/src/types.ts`

### Add Interfaces

After the existing `LLMProvider` interface, add:

```typescript
// Today Sheet Input/Output Types
export interface TodaySheetInput {
  captures: Capture[];
  existingTodos: Todo[];
  template: Template;
  context: {
    currentTimeOfDay: number; // 0-23
    workingHoursMinutes: number;
    currentDate: string; // ISO date (YYYY-MM-DD)
  };
}

export interface TodaySheetTaskItem {
  title: string;
  description?: string;
  timeEstimate: 'quick' | 'medium' | 'long';
  priorityScore: number; // 0-100
  tags: string[];
  sourceType: 'capture' | 'todo';
  sourceId: string; // captureId or todoId
  dueDate?: string; // ISO date string
}

export interface TodaySheetOutput {
  summary: string; // Natural language plan summary (1-2 sentences)
  sections: {
    must_do_today: TodaySheetTaskItem[];
    likely_today: TodaySheetTaskItem[];
    opportunistic: TodaySheetTaskItem[];
    overflow: TodaySheetTaskItem[];
  };
  totalEstimatedMinutes: number;
}
```

### Extend LLMProvider Interface

Add new method to interface (after `extractTasks`):

```typescript
export interface LLMProvider {
  organize(captures: Capture[], template: Template): Promise<OrganizedOutput>;
  extractTasks(text: string): Promise<{ content: string; dueDate?: string }[]>;

  // NEW METHOD
  generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput>;
}
```

---

## Step 2: Add Prompt Builder to BaseLLMProvider

**File**: `/packages/llm/src/base-provider.ts`

Add this method to the `BaseLLMProvider` class (after existing methods):

```typescript
/**
 * Build prompt for Today Sheet generation
 */
protected buildTodaySheetPrompt(input: TodaySheetInput): string {
  const remainingHours = Math.max(0, 17 - input.context.currentTimeOfDay); // 9-5 workday

  return `You are generating a Today Sheet - a focused daily action plan for a knowledge worker.

CONTEXT:
- Current time: ${input.context.currentTimeOfDay}:00
- Remaining hours today: ${remainingHours}
- Available working time: ${input.context.workingHoursMinutes} minutes
- Date: ${input.context.currentDate}

UNORGANIZED CAPTURES (${input.captures.length}):
${input.captures.map((c, i) =>
  `${i + 1}. [${new Date(c.timestamp).toLocaleString()}] ${c.content}`
).join('\n')}

EXISTING TODOS (${input.existingTodos.length}):
${input.existingTodos.map((t, i) =>
  `${i + 1}. ${t.content}${t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString()})` : ''}`
).join('\n')}

USER TEMPLATE:
${input.template.prompt}

YOUR TASK:
1. Extract actionable tasks from captures (skip pure notes/info)
2. Include relevant existing todos
3. Prioritize by: due dates (today/overdue highest), importance, effort, available time
4. Assign to sections:
   - must_do_today: Due today/overdue, critical items (3-7 max)
   - likely_today: Important, high-impact, fits capacity
   - opportunistic: Nice-to-have, quick wins, no urgency
   - overflow: Defer to later this week
5. Time estimates: quick (<15min), medium (30-60min), long (>90min)
6. Generate 1-2 sentence summary of day's focus

OUTPUT FORMAT (CRITICAL - valid JSON only):
{
  "summary": "Focus on completing security PR review and finalizing Q4 report.",
  "sections": {
    "must_do_today": [
      {
        "title": "Review security PR #482",
        "description": "Critical security fix needs approval",
        "timeEstimate": "medium",
        "priorityScore": 95,
        "tags": ["security", "code-review"],
        "sourceType": "capture",
        "sourceId": "uuid-from-captures-array",
        "dueDate": "${input.context.currentDate}"
      }
    ],
    "likely_today": [],
    "opportunistic": [],
    "overflow": []
  },
  "totalEstimatedMinutes": 240
}

Time estimates in minutes: quick=10, medium=45, long=90
Total should not exceed ${input.context.workingHoursMinutes} minutes.`;
}
```

---

## Step 3: Implement in OpenAI Provider

**File**: `/packages/llm/src/providers/openai-provider.ts`

Add this method to the `OpenAIProvider` class:

```typescript
async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
  const systemPrompt = this.buildSystemPrompt();
  const userPrompt = this.buildTodaySheetPrompt(input);

  const response = await this.client.chat.completions.create({
    model: this.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5, // More deterministic than organize
    response_format: { type: 'json_object' }, // Enforce JSON
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return this.parseResponse<TodaySheetOutput>(content);
}
```

---

## Step 4: Implement in Anthropic Provider

**File**: `/packages/llm/src/providers/anthropic-provider.ts`

Add this method to the `AnthropicProvider` class:

```typescript
async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
  const systemPrompt = this.buildSystemPrompt();
  const userPrompt = this.buildTodaySheetPrompt(input);

  const response = await this.client.messages.create({
    model: this.model,
    max_tokens: 4096,
    temperature: 0.5, // More deterministic
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return this.parseResponse<TodaySheetOutput>(content.text);
}
```

---

## Step 5: Implement in Ollama Provider

**File**: `/packages/llm/src/providers/ollama-provider.ts`

Add this method to the `OllamaProvider` class:

```typescript
async generateTodaySheet(input: TodaySheetInput): Promise<TodaySheetOutput> {
  const systemPrompt = this.buildSystemPrompt();
  const userPrompt = this.buildTodaySheetPrompt(input);

  const response = await fetch(`${this.baseURL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: this.model,
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      format: 'json', // Ollama JSON mode
      stream: false,
      options: {
        temperature: 0.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return this.parseResponse<TodaySheetOutput>(data.response);
}
```

---

## Step 6: Test with Real Data

Create test file: `/packages/llm/test-today-sheet-generation.ts`

```typescript
import { createFromEnv } from './src/provider-factory';
import type { TodaySheetInput } from './src/types';

async function testTodaySheetGeneration() {
  const provider = createFromEnv();

  console.log('🧪 Testing Today Sheet generation...\n');
  console.log('Provider:', process.env.LLM_PROVIDER || 'openai');

  const mockInput: TodaySheetInput = {
    captures: [
      {
        id: 'capture-1',
        userId: 'test-user',
        content: 'Need to review PR #482 for security fix. Blocking deployment.',
        timestamp: new Date(),
        metadata: null,
        organized: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'capture-2',
        userId: 'test-user',
        content: 'Schedule Q4 planning meeting with leadership team.',
        timestamp: new Date(),
        metadata: null,
        organized: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'capture-3',
        userId: 'test-user',
        content: 'Update API documentation for v2 endpoints.',
        timestamp: new Date(),
        metadata: null,
        organized: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    existingTodos: [
      {
        id: 'todo-1',
        userId: 'test-user',
        content: 'Finalize Q4 budget report',
        status: 'pending',
        dueDate: new Date(), // Due today
        completedAt: null,
        todaySheetSection: 'none',
        todaySheetOrder: null,
        timeEstimate: 'none',
        priorityScore: null,
        tags: [],
        captureId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    template: {
      id: 'template-1',
      userId: 'test-user',
      name: 'Daily Planning',
      prompt: 'Prioritize security and compliance tasks. Group related items. Highlight deadlines.',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    context: {
      currentTimeOfDay: 9, // 9 AM
      workingHoursMinutes: 480, // 8 hours
      currentDate: new Date().toISOString().split('T')[0],
    },
  };

  try {
    console.log('📝 Input:');
    console.log('  - Captures:', mockInput.captures.length);
    console.log('  - Existing todos:', mockInput.existingTodos.length);
    console.log('  - Time:', mockInput.context.currentTimeOfDay + ':00');
    console.log('  - Available:', mockInput.context.workingHoursMinutes, 'minutes\n');

    console.log('🤖 Calling LLM...\n');
    const result = await provider.generateTodaySheet(mockInput);

    console.log('✅ Generated Today Sheet:\n');
    console.log('📋 Summary:', result.summary);
    console.log('⏱️  Total time:', result.totalEstimatedMinutes, 'minutes\n');

    for (const [section, items] of Object.entries(result.sections)) {
      const sectionName = section.replace(/_/g, ' ').toUpperCase();
      console.log(`\n${sectionName} (${items.length} items):`);
      items.forEach((item, i) => {
        console.log(`  ${i + 1}. [${item.timeEstimate}] ${item.title}`);
        console.log(`     Score: ${item.priorityScore} | Tags: ${item.tags.join(', ')}`);
        console.log(`     Source: ${item.sourceType} (${item.sourceId.slice(0, 8)}...)`);
        if (item.description) {
          console.log(`     → ${item.description}`);
        }
      });
    }

    console.log('\n\n🎉 Test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTodaySheetGeneration();
```

Run test:
```bash
# Test with OpenAI (default)
LLM_PROVIDER=openai OPENAI_API_KEY=your-key pnpm --filter llm tsx test-today-sheet-generation.ts

# Test with Anthropic
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=your-key pnpm --filter llm tsx test-today-sheet-generation.ts

# Test with Ollama (make sure Ollama is running locally)
LLM_PROVIDER=ollama pnpm --filter llm tsx test-today-sheet-generation.ts
```

---

## Verification Checklist

- [ ] Types added to `/packages/llm/src/types.ts`
- [ ] `TodaySheetInput` interface defined
- [ ] `TodaySheetOutput` interface defined
- [ ] `TodaySheetTaskItem` interface defined
- [ ] `generateTodaySheet` method added to `LLMProvider` interface
- [ ] `buildTodaySheetPrompt` added to `BaseLLMProvider`
- [ ] `generateTodaySheet` implemented in `OpenAIProvider`
- [ ] `generateTodaySheet` implemented in `AnthropicProvider`
- [ ] `generateTodaySheet` implemented in `OllamaProvider`
- [ ] Test with OpenAI - generates valid JSON
- [ ] Test with Anthropic - generates valid JSON
- [ ] Test with Ollama - generates valid JSON
- [ ] Verify sections are populated correctly
- [ ] Verify time estimates are assigned
- [ ] Verify priority scores are in 0-100 range
- [ ] Verify summary is generated

---

## Expected Output Structure

```json
{
  "summary": "Focus on security PR and Q4 report, with time for planning meeting.",
  "sections": {
    "must_do_today": [
      {
        "title": "Review security PR #482",
        "description": "Blocking deployment",
        "timeEstimate": "medium",
        "priorityScore": 95,
        "tags": ["security", "urgent"],
        "sourceType": "capture",
        "sourceId": "capture-1",
        "dueDate": "2026-01-28"
      },
      {
        "title": "Finalize Q4 budget report",
        "timeEstimate": "long",
        "priorityScore": 90,
        "tags": ["budget", "deadline"],
        "sourceType": "todo",
        "sourceId": "todo-1",
        "dueDate": "2026-01-28"
      }
    ],
    "likely_today": [
      {
        "title": "Schedule Q4 planning meeting",
        "timeEstimate": "quick",
        "priorityScore": 70,
        "tags": ["planning", "meeting"],
        "sourceType": "capture",
        "sourceId": "capture-2"
      }
    ],
    "opportunistic": [
      {
        "title": "Update API documentation",
        "timeEstimate": "medium",
        "priorityScore": 50,
        "tags": ["documentation"],
        "sourceType": "capture",
        "sourceId": "capture-3"
      }
    ],
    "overflow": []
  },
  "totalEstimatedMinutes": 145
}
```

---

## Critical Files to Modify

1. `/packages/llm/src/types.ts` - Add 3 interfaces + extend LLMProvider
2. `/packages/llm/src/base-provider.ts` - Add buildTodaySheetPrompt method
3. `/packages/llm/src/providers/openai-provider.ts` - Implement generateTodaySheet
4. `/packages/llm/src/providers/anthropic-provider.ts` - Implement generateTodaySheet
5. `/packages/llm/src/providers/ollama-provider.ts` - Implement generateTodaySheet

---

## Troubleshooting

**Invalid JSON from LLM:**
- OpenAI: Use `response_format: { type: 'json_object' }` (already included)
- Anthropic: May need to add "Return valid JSON" emphasis in prompt
- Ollama: Use `format: 'json'` parameter (already included)

**Empty sections:**
- Check that captures/todos are being passed correctly
- Verify template prompt is not too restrictive
- Lower temperature if results are too random

**Timeout errors:**
- Increase max_tokens for Anthropic (current: 4096)
- Reduce number of captures/todos in test
- Check API key is valid

---

## Next Steps (Phase 3)

After Phase 2:
- Create TodaySheetService (orchestrates LLM + database)
- Build API endpoints (/today-sheet/generate, /today-sheet)
- Add validation schemas
- Test end-to-end generation flow
