# Ollama Structured Outputs Integration

## Issue
Issue #12: "Ollama generation sucks" - The Ollama provider was producing inconsistent results with malformed JSON and hallucinations.

## Solution
Integrated the official Ollama Node.js package with structured outputs support to improve generation quality and reliability.

## Changes Made

### 1. Package Dependencies
- Added `ollama` (v0.6.3) - Official Ollama JavaScript SDK
- Added `zod-to-json-schema` (v3.25.1) - Convert Zod schemas to JSON schemas

### 2. OllamaProvider Refactoring (`packages/llm/src/providers/ollama-provider.ts`)

**Before:**
```typescript
// Used raw fetch() calls with basic JSON mode
const response = await fetch(`${this.baseURL}/api/chat`, {
  method: 'POST',
  body: JSON.stringify({
    model: this.model,
    messages: [...],
    format: 'json', // Simple JSON mode
  }),
});
```

**After:**
```typescript
// Uses Ollama SDK with structured outputs (JSON Schema)
const jsonSchema = zodToJsonSchema(organizedOutputSchema, 'organizedOutput');

const response = await this.client.chat({
  model: this.model,
  messages: [...],
  format: jsonSchema, // Full JSON schema for structured outputs
  options: { temperature: this.temperature },
});
```

### 3. Benefits

#### Structured Outputs
- **JSON Schema Validation**: Ollama enforces the exact structure we expect
- **Type Safety**: Responses match our TypeScript types exactly
- **Reduced Hallucinations**: Model can't generate invalid fields or structures
- **Better Consistency**: Same format every time

#### Code Quality
- **Official SDK**: Uses maintained library instead of raw HTTP calls
- **Better Error Handling**: SDK provides proper error types and messages
- **Cleaner Code**: Less boilerplate, more readable

#### All Methods Updated
1. `organize()` - Extracts todos from captures with structured output
2. `extractTasks()` - Parses tasks from text with schema validation
3. `generateTodaySheet()` - Creates daily plans with complex nested structure

### 4. Testing

Created `packages/llm/test-ollama-structured.ts` for manual testing:

```bash
cd packages/llm
pnpm tsx test-ollama-structured.ts
```

This test:
- Creates mock captures
- Calls the organize method
- Validates structured output
- Displays extracted todos

### 5. Backward Compatibility

✅ **Fully backward compatible**
- No breaking changes to public API
- Existing code using OllamaProvider works unchanged
- Same configuration (`.env` with `OLLAMA_BASE_URL`)
- Default model remains `mistral`

### 6. Requirements

**Ollama Version**: Requires Ollama v0.1.26+ for JSON schema support in the `format` parameter.

**Recommended Models**:
- `mistral` (default) - Good balance of speed and quality
- `llama3.1` - Better reasoning, slower
- `qwen2.5` - Strong performance on structured tasks

### 7. Configuration

No changes needed to existing configuration:

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
```

Optional: Override model in code:
```typescript
const provider = new OllamaProvider({
  baseURL: 'http://localhost:11434',
  model: 'llama3.1',
  temperature: 0.7,
});
```

## Technical Details

### JSON Schema Conversion

The integration uses `zod-to-json-schema` to convert our Zod validation schemas into JSON schemas that Ollama understands:

```typescript
// Zod schema (type-safe validation)
const organizedOutputSchema = z.object({
  todos: z.array(
    z.object({
      content: z.string(),
      dueDate: z.string().optional(),
    })
  ),
});

// Convert to JSON schema for Ollama
const jsonSchema = zodToJsonSchema(organizedOutputSchema, 'organizedOutput');

// Result:
// {
//   "type": "object",
//   "properties": {
//     "todos": {
//       "type": "array",
//       "items": {
//         "type": "object",
//         "properties": {
//           "content": { "type": "string" },
//           "dueDate": { "type": "string" }
//         },
//         "required": ["content"]
//       }
//     }
//   },
//   "required": ["todos"]
// }
```

### Response Validation Flow

1. **Prompt Construction**: Base provider builds prompt with system + user messages
2. **Schema Conversion**: Zod schema → JSON schema (for Ollama)
3. **LLM Generation**: Ollama generates response conforming to schema
4. **Parse Response**: Extract JSON from response
5. **Validate**: Zod schema validates the parsed JSON
6. **Return**: Type-safe TypeScript object

This ensures that:
- LLM generates valid structure (via JSON schema)
- Response is validated (via Zod)
- TypeScript types are correct (via schema inference)

## Performance Notes

Structured outputs may add slight overhead (1-2 seconds) due to:
- JSON schema processing by Ollama
- More constrained generation space

However, the benefits far outweigh the cost:
- ✅ Fewer retries due to malformed responses
- ✅ No need for response repair logic
- ✅ Higher quality outputs
- ✅ Better user experience

## Future Improvements

Potential enhancements for future iterations:
1. Support for streaming with structured outputs
2. Custom schema definitions per template
3. Model-specific schema optimizations
4. Retry logic with exponential backoff
5. Response caching for common queries

## References

- [Ollama JavaScript SDK](https://github.com/ollama/ollama-js)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Zod to JSON Schema](https://github.com/StefanTerdell/zod-to-json-schema)
- [JSON Schema Specification](https://json-schema.org/)
