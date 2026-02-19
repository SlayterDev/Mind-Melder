# LLM Organization Setup Guide

This guide explains how to configure and use the LLM-powered organization feature in Mind Melder.

## Overview

Mind Melder uses Large Language Models (LLMs) to automatically organize your captured notes into structured content and extract actionable todos. The system supports three providers:

- **OpenAI** (GPT-4o-mini, GPT-4, etc.) - Uses native structured outputs
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus, etc.) - Uses prompt engineering for JSON
- **Ollama** (Local models like Mistral, Llama 3.1, etc.) - **Now uses structured outputs (JSON schema)** for improved reliability

### Recent Improvements

**Ollama Integration (v1.1)**
- Migrated from raw HTTP to official Ollama Node.js SDK
- Implemented structured outputs using JSON Schema for better consistency
- Reduced hallucinations and malformed responses
- Automatic validation using Zod schemas

## Configuration

### Configure API Keys

#### OpenAI

```bash
OPENAI_API_KEY=sk-your-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

Default model: `gpt-4o-mini` (fast and cost-effective)

#### Anthropic

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Get your API key from: https://console.anthropic.com/

Default model: `claude-3-5-sonnet-20241022`

#### Ollama (Local)

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

1. Install Ollama: https://ollama.com/download
2. Pull a model: `ollama pull mistral` (or `llama3.1`, `qwen2.5`, etc.)
3. Start Ollama (usually runs automatically)
4. Verify with: `ollama list` to see installed models

Default model: `mistral`

**Important:** Ollama now uses structured outputs (JSON schema) for better reliability. Make sure you're using a recent version of Ollama (v0.1.26+) that supports the `format` parameter with JSON schemas.

## Usage

### 1. Create an Organization Template

Templates define how the LLM should organize your notes.

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Review",
    "prompt": "Organize notes by: Work, Personal, Ideas. Extract todos with due dates when mentioned. Be concise."
  }'
```

**Template Tips:**
- Be specific about categories you want
- Mention if you want todos extracted
- Include formatting preferences
- Keep prompts focused (100-500 characters ideal)

### 2. Capture Notes

Add notes throughout the day:

```bash
curl -X POST http://localhost:3000/api/v1/captures \
  -H "Content-Type: application/json" \
  -d '{"content": "Schedule team meeting for Friday"}'
```

### 3. Trigger Organization

Run the organization process (manually or on schedule):

```bash
# Use active template
curl -X POST http://localhost:3000/api/v1/organize

# Use specific template
curl -X POST http://localhost:3000/api/v1/organize \
  -H "Content-Type: application/json" \
  -d '{"templateId": "your-template-id"}'
```

The LLM will:
1. Read all unorganized captures
2. Follow your template instructions
3. Create organized notes (grouped by category)
4. Extract actionable todos (with due dates if mentioned)
5. Mark captures as processed

### 4. Review Results

```bash
# View organized notes
curl http://localhost:3000/api/v1/notes

# View extracted todos
curl http://localhost:3000/api/v1/todos?status=pending

# Check if captures were processed
curl http://localhost:3000/api/v1/captures/unorganized
```

## Testing

Run the test script to see the full flow:

```bash
chmod +x test-organization.sh
./test-organization.sh
```

**Note:** This requires a valid API key configured in `.env`

## Cost Considerations

### OpenAI
- gpt-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Organizing 50 captures (~500 words): ~$0.001-0.002

### Anthropic
- Claude 3.5 Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Organizing 50 captures: ~$0.01-0.02

### Ollama (Local)
- **Free** - Runs on your machine
- Requires decent hardware (8GB+ RAM recommended)
- Slower than cloud APIs

## Troubleshooting

### "OpenAI API key is required"

Make sure you have `OPENAI_API_KEY` set in your `.env` file and it's valid.

### "No active template found"

Create a template first using the `/api/v1/templates` endpoint.

### Ollama Connection Failed

1. Check if Ollama is running: `ollama list`
2. Verify the base URL matches: `http://localhost:11434`
3. Make sure you've pulled a model: `ollama pull mistral`
4. Ensure you're using Ollama v0.1.26+ (structured outputs support)
5. Test with: `cd packages/llm && pnpm tsx test-ollama-structured.ts`

### Poor Organization Results

Try:
- Making your template more specific
- Using a better model (GPT-4 vs GPT-4o-mini)
- Including example structure in your prompt
- Breaking captures into smaller batches

## API Response Format

The `/api/v1/organize` endpoint returns:

```json
{
  "success": true,
  "result": {
    "capturesProcessed": 4,
    "organizedNotesCount": 3,
    "todosCount": 2
  },
  "message": "Organized 4 captures into 3 notes and 2 todos"
}
```

## Next Steps

- Set up scheduled organization (M5) to run automatically
- Customize templates for different workflows
- Export organized notes to Markdown (M5)
