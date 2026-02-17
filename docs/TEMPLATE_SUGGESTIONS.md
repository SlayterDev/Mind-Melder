# Template Improvement Suggestions Feature

## Overview

The Weekly Review feature now includes AI-powered template improvement suggestions. After generating a weekly review, users can request personalized suggestions to improve their organization template based on their productivity patterns.

## Feature Components

### Backend (API)

#### New Endpoint
**POST** `/api/v1/weekly-review/template-suggestions`

**Request Body:**
```json
{
  "templateId": "uuid-of-template"
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "title": "Add Priority Scoring Criteria",
      "description": "The current template doesn't specify how to determine priority. Adding clear criteria for scoring (urgency, impact, dependencies) will help ensure critical tasks are identified correctly.",
      "improvedPrompt": "Extract actionable tasks from captures... [full improved prompt]"
    },
    {
      "title": "Include Context Extraction Guidelines",
      "description": "Missing guidance on extracting key context like people mentioned, deadlines, or project names. This context helps make todos actionable and easy to understand later.",
      "improvedPrompt": "Extract actionable tasks from captures... [full improved prompt]"
    },
    {
      "title": "Enhance Time Estimation Guidance",
      "description": "Based on your weekly review, 45% of tasks took longer than estimated. Adding more detailed time estimation criteria will improve planning accuracy.",
      "improvedPrompt": "Extract actionable tasks from captures... [full improved prompt]"
    }
  ]
}
```

#### Implementation Details

**Files Modified:**
- `apps/api/src/routes/weekly-review.ts` - Added template suggestions endpoint
- `apps/api/src/index.ts` - Passed templatesRepo to weekly review router

**Logic Flow:**
1. Validate templateId and verify user owns the template
2. Fetch the latest weekly review for context (optional)
3. Call LLM provider's `generateTemplateSuggestions()` method
4. Return 3 AI-generated suggestions with reasoning

### Frontend (Web UI)

#### New UI Section

**Location:** Weekly Review Page, after the Recommendations section

**Features:**
1. **Get Suggestions Button** - Triggers AI analysis of current template
2. **Suggestion Cards** - Expandable cards showing each suggestion
3. **Preview** - Full improved prompt text visible when expanded
4. **Apply Button** - One-click application of suggested improvements

**Files Modified:**
- `apps/web/src/pages/WeeklyReviewPage.tsx` - Added template suggestions UI
- `apps/web/src/api/client.ts` - Added `getTemplateSuggestions()` method

#### User Experience

1. User generates or views a weekly review
2. Scrolls to "Template Improvements" section
3. Clicks "Get Suggestions" button
4. AI analyzes template and weekly review insights
5. Three suggestions appear with titles and descriptions
6. User expands a suggestion to see full improved prompt
7. User clicks "Apply This Suggestion" to update their template
8. Success message confirms template was updated

#### Visual Design

The UI follows the existing Weekly Review page design patterns:
- **Accent color** (yellow) for suggestion highlights
- **Card-based layout** matching other sections
- **Expandable sections** for detailed content
- **Loading states** with spinner animations
- **Success/error messaging** consistent with page style

### LLM Integration

The feature uses the existing `generateTemplateSuggestions()` method implemented in all LLM providers:
- **OpenAI** (openai-provider.ts)
- **Anthropic** (anthropic-provider.ts)
- **Ollama** (ollama-provider.ts)

**Context Used:**
- Current template name and prompt
- Weekly review insights (if available):
  - Completion rate
  - Top categories
  - Key observations
  - Recommendations

**Output Guarantees:**
- Exactly 3 suggestions (enforced by Zod schema)
- Each suggestion includes title, description, and full improved prompt
- Suggestions address different aspects (prioritization, context, personalization, etc.)

## Testing

### Manual Testing Script

Run `scripts/test-template-suggestions.sh` to test the API endpoint:

```bash
cd /home/runner/work/Mind-Melder/Mind-Melder
./scripts/test-template-suggestions.sh
```

**Prerequisites:**
- PostgreSQL running (via `docker compose up -d postgres`)
- API server running (via `pnpm --filter ./apps/api dev`)
- Valid LLM API key configured in `.env`

### Expected Behavior

1. Creates a test template and activates it
2. Creates sample captures and todos for context
3. Requests template improvement suggestions
4. Displays 3 suggestions with titles

### Type Safety

All TypeScript code passes type checking:
```bash
npx tsc --noEmit --project apps/api/tsconfig.json  # ✅ No errors
npx tsc --noEmit --project apps/web/tsconfig.json  # ✅ No errors
```

## Architecture Decisions

### Why in Weekly Review?

Template suggestions are contextually relevant after reviewing a week's productivity. The weekly review provides:
- Real data on what's working/not working
- Patterns in task completion
- Insights the AI can use for personalization

### Why 3 Suggestions?

- **Not overwhelming** - Easy to evaluate quickly
- **Diverse** - Cover different improvement areas
- **Actionable** - Each can be applied independently

### Why Full Prompts?

Rather than showing diffs, we provide complete improved prompts because:
- **Clarity** - Users see exactly what they'll get
- **Simplicity** - No mental merging required
- **Flexibility** - Users can copy/paste or edit before applying

## Future Enhancements

Potential improvements for future iterations:

1. **A/B Testing** - Track which suggestions users apply most
2. **Custom Focus Areas** - Let users specify what to improve
3. **Suggestion History** - Remember past suggestions and outcomes
4. **Diff View** - Show before/after comparison
5. **Batch Apply** - Merge multiple suggestions intelligently

## Security Considerations

- **Authorization** - Verifies user owns template before generating suggestions
- **Validation** - Zod schemas ensure LLM output structure
- **No Data Leakage** - Only user's own data used in prompts
- **Rate Limiting** - Future: Consider rate limits for AI calls

## Performance

- **Async Generation** - UI shows loading state during AI processing
- **No Caching** - Fresh suggestions each time (future: cache by week)
- **Typical Response Time** - 2-5 seconds depending on LLM provider

---

**Status:** ✅ Implemented and Ready for Testing
**PR:** Part of Weekly Review Feature Enhancement
