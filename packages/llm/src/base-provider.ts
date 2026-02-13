import type { Capture, Template, Tag } from 'types';
import type { TodaySheetInput } from './types.js';
import { z } from 'zod';

export abstract class BaseLLMProvider {
  /**
   * Build the system prompt for organization
   */
  protected buildSystemPrompt(): string {
    return `You are an AI assistant that helps extract actionable tasks from notes.
Your job is to:
1. Read through a batch of captured notes, which may be unstructured, messy, incomplete, or in short form
2. Extract any actionable tasks or todos from the content
3. Transform unclear or abbreviated notes into clear, action-oriented tasks
4. Add context and details to make tasks independently understandable
5. Follow the user's template instructions for organization style
`;
  }

  /**
   * Build the system prompt for chat title generation
   */
  protected buildChatTitleSystemPrompt(): string {
    return 'Generate a concise title (6 words max) for this conversation. Return ONLY the title text, no quotes or punctuation wrapping.';
  }

  /**
   * Build the user prompt with captures and template
   */
  protected buildOrganizePrompt(captures: Capture[], template: Template, tags?: Tag[], includeDescriptions: boolean = false, contentLockEnabled: boolean = false): string {
    const captureList = captures
      .map((c, i) => `${i + 1}. ID: ${c.id} | [${new Date(c.timestamp).toLocaleString()}] ${c.content}`)
      .join('\n');

    let tagsInstruction = '';
    if (tags && tags.length > 0) {
      const tagsList = tags
        .map(tag => includeDescriptions && tag.description ? `${tag.name} (${tag.description})` : tag.name)
        .join(', ');
      tagsInstruction = `\nCATEGORIZATION TAGS:
- Use the following tags to categorize tasks: ${tagsList}.
- Assign appropriate tags to each task in the "tags" array field using only this list. Do not create new tags.
- If no relevant tag exists, leave the "tags" array empty for that task.
`;
    } else {
      tagsInstruction = '\nCATEGORIZATION: Use your best judgment to categorize todos with relevant tags.';
    }

    return `You are extracting actionable todos from a batch of unorganized captures.

CAPTURED NOTES (${captures.length}):
${captureList}

YOUR TASK:
1. Extract actionable tasks from captures.
${contentLockEnabled
  ? `2. Use the EXACT original capture text as the task title verbatim. Do NOT rewrite, expand abbreviations, or modify it. You MAY generate a description to add context.`
  : `2. Transform each capture into a clear, actionable task with:
   - Title: Concise action-oriented summary (5-10 words) that makes the task immediately clear
   - Description: Additional context, reasoning, or implementation details from the original capture
   - Expand abbreviations, add clarity, make titles scannable
   - Example: "auth middleware jwt" → Title: "Refactor authentication middleware for JWT support" / Description: "Update existing middleware to handle JWT tokens properly"`}
3. Assign time estimates based on task complexity:
   - quick: < 15 minutes (simple edits, quick reviews, small fixes)
   - medium: 30-60 minutes (moderate coding, research, planning)
   - long: > 90 minutes (complex features, major refactors, deep investigations)
4. Assign priority scores (0-100) based on:
   - Urgency: Is there a deadline or time-sensitive aspect?
   - Impact: How important is this task to overall goals?
   - Dependencies: Do other tasks depend on this?
   - Use 80-100 for critical/urgent, 50-79 for important, 20-49 for nice-to-have, 0-19 for low-priority
5. Look for critical information in captures to include in titles/descriptions:
   - People mentioned (names, roles)
   - Deadlines or time references
   - Project names or areas
   - Specific technical details
6. Extract due dates when explicitly mentioned or strongly implied
   - Look for phrases like "by Friday", "tomorrow", "end of week", "due on..."
   - Convert relative dates to actual dates based on capture timestamp
   - Leave dueDate null if not clearly indicated

${contentLockEnabled
  ? `CONTENT LOCK (ENABLED - STRICT):
- Use the EXACT original capture text as the task title verbatim
- Do NOT rewrite, expand abbreviations, or modify titles in any way
- You MAY generate a description to add context`
  : `TITLE GUIDELINES:
- Be specific and action-oriented (start with verbs: "Review", "Update", "Fix", "Implement", "Research", "Plan")
- Include key details in the title itself, not just in description
- Expand abbreviations and incomplete thoughts
- Make titles independently understandable without reading the description
- Description should add context and details, not be the primary information`}

${tagsInstruction}

USER TEMPLATE INSTRUCTIONS:
${template.prompt}

CRITICAL RULE FOR sourceId:
- You MUST use the exact ID from the captures list above (copy the UUID after "ID:")
- Use sourceType="capture" for all tasks extracted from captures
- NEVER generate new IDs or use numbers like "1", "2", etc.

OUTPUT FORMAT (valid JSON only):
{
  "todos": [
    {
      "title": "Review security PR #482 for authentication changes",
      "description": "Critical security fix for JWT token validation needs approval before deployment",
      "timeEstimate": "medium",
      "priorityScore": 85,
      "tags": ["security", "code-review"],
      "sourceType": "capture",
      "sourceId": "<INSERT_EXACT_UUID_FROM_LIST_ABOVE>",
      "dueDate": "2026-02-07"
    }
  ]
}

Time estimates: quick (<15min), medium (30-60min), long (>90min)
Priority scores: 0-100 (higher = more important/urgent)
Return valid JSON only.`;
  }

  /**
   * Build the system prompt for note refinement
   */
  protected buildRefineNoteSystemPrompt(): string {
    return `You are a note editor assistant. The user will provide a note (title + content in markdown) along with instructions for how to refine it. Apply the user's instructions and return the refined note.

Rules:
- Return valid JSON with "title" and "content" fields
- The content should be valid markdown
- Preserve any information from the original note unless the user's instructions say otherwise
- If the user asks to "clean up" or "organize", improve structure, fix formatting, remove redundancy, and improve readability
- Sections marked with "---- APPENDED ----" are quick captures that were appended — integrate them naturally into the note structure
- Keep the same general tone and voice of the original note
- If a summary is requested, add it at the top of the content field under a "Summary" third-level heading (e.g. "### Summary") unless the user's instructions specify otherwise`;
  }

  /**
   * Build the user prompt for note refinement
   */
  protected buildRefineNotePrompt(title: string, content: string, prompt: string): string {
    return `CURRENT NOTE TITLE:
${title}

CURRENT NOTE CONTENT:
${content}

YOUR INSTRUCTIONS:
${prompt}

OUTPUT FORMAT (valid JSON only):
{
  "title": "Refined title here",
  "content": "Refined markdown content here"
}

Return valid JSON only.`;
  }

  /**
   * Build the task extraction prompt
   */
  protected buildTaskExtractionPrompt(text: string): string {
    return `Extract actionable tasks from the following text. Return valid JSON only.

Text:
${text}

Format:
{
  "todos": [
    {"content": "task description", "dueDate": "optional ISO date"}
  ]
}`;
  }

  /**
   * Build prompt for Today Sheet generation
   */
  protected buildTodaySheetPrompt(input: TodaySheetInput): string {
    const remainingHours = Math.max(0, 17 - input.context.currentTimeOfDay); // 9-5 workday

    // Build tags instruction if tags are provided
    let tagsInstruction = 'Use your best judgment to assign tags to tasks.';
    if (input.tags && input.tags.length > 0) {
      const includeDescriptions = input.includeDescriptions ?? false;
      const tagsList = input.tags
        .map(tag => includeDescriptions && tag.description ? `${tag.name} (${tag.description})` : tag.name)
        .join(', ');
      tagsInstruction = `\nCATEGORIZATION TAGS:
- Use the following tags to categorize tasks: ${tagsList}.
- Assign appropriate tags to each task in the "tags" array field using only this list. Do not create new tags.
- If no relevant tag exists, leave the "tags" array empty for that task.
`;
    }

    return `You are generating a Today Sheet - a focused daily action plan for a knowledge worker.

CONTEXT:
- Current time: ${input.context.currentTimeOfDay}:00
- Remaining hours today: ${remainingHours}
- Available working time: ${input.context.workingHoursMinutes} minutes
- Date: ${input.context.currentDate}

UNORGANIZED CAPTURES (${input.captures.length}):
${input.captures.map((c, i) =>
  `${i + 1}. ID: ${c.id} | [${new Date(c.timestamp).toLocaleString()}] ${c.content}`
).join('\n')}

EXISTING TODOS (${input.existingTodos.length}):
${input.existingTodos.map((t, i) =>
  `${i + 1}. ID: ${t.id} | ${t.content}${t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString()})` : ''}`
).join('\n')}

YOUR TASK:
1. Extract actionable tasks from captures (skip pure notes/info)
${input.contentLockEnabled
  ? `2. Use the EXACT original capture text as the task title verbatim for captures. Do NOT rewrite, expand abbreviations, or modify it. You MAY generate a description to add context.
  - For existing todos: Use the EXACT existing todo content as the title. Do NOT change the title or description.`
  : `2. Transform captures into clear, actionable task titles:
  - Title: Concise action-oriented summary (5-10 words) that makes the task immediately clear
  - Description: Additional context, reasoning, or implementation details from the original capture
  - Expand abbreviations, add clarity, make titles scannable
  - Example: "auth middleware jwt" → Title: "Refactor authentication middleware for JWT support" / Description: "Update existing middleware to handle JWT tokens properly"`}
3. Include relevant existing todos
4. Prioritize by: due dates (today/overdue highest), importance, effort, available time
5. Assign to sections, balancing workload:
   - must_do_today: Due today/overdue, critical items (3-4 max), don't overload
   - likely_today: Important, high-impact, fits capacity
   - opportunistic: Nice-to-have, quick wins, no urgency
   - overflow: Defer to later this week, use as backlog
6. Time estimates: quick (<15min), medium (30-60min), long (>90min)
7. Generate 1-2 sentence summary of day's focus
8. Defer non-urgent, low-value tasks to future days
9. Defer to user template instructions below for any additional formatting or organization rules
10. Look for critical info like people, deadlines, project names to include in titles/descriptions

${input.feedbackTodos.length > 0 
  ? `PREVIOUS USER FEEDBACK:
Use to improve task extraction and prioritization. Don't consider these as input captures unless they are also in the captures or existing todos list above. 
${input.feedbackTodos.map((t, i) =>
  `${i + 1}. ID: ${t.id} | ${t.content} | ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No due date'} | Tags: [${t.tags?.join(', ')}] | Feedback: ${t.feedbackVote === 'thumbs_up' ? 'Helpful' : 'Not Helpful'}${t.feedbackText ? ` | Comments: ${t.feedbackText}` : ''}`
).join('\n')}` 
  : ''}

${tagsInstruction}

${input.contentLockEnabled
  ? `CONTENT LOCK (ENABLED - STRICT):
- For captures (sourceType="capture"): Use the EXACT original capture text as the title verbatim. Do NOT rewrite, expand abbreviations, or modify it. You MAY generate a description.
- For existing todos (sourceType="todo"): Use the EXACT existing todo content as the title. Do NOT change the title or description.`
  : `TITLE GUIDELINES:
  - Be specific and action-oriented (start with verbs: "Review", "Update", "Fix", "Implement")
  - Include key details in the title itself, not just in description
  - Expand abbreviations and incomplete thoughts
  - Make titles independently understandable without reading the description
  - Description should add context, not be the primary information`}

USER TEMPLATE:
${input.template.prompt}

CRITICAL RULE FOR sourceId:
- You MUST use the exact ID from the input lists above (copy the UUID after "ID:")
- For captures, use sourceType="capture" and copy the ID from the captures list
- For todos, use sourceType="todo" and copy the ID from the todos list
- NEVER generate new IDs or use numbers like "1", "2", etc.

CRITICAL RULE FOR DUE DATES:
- Do not assign dates before today's date (${input.context.currentDate})
- Look for semantic clues in the capture/todo content for due dates
- If no due date is indicated, or the capture is not clearly urgent, leave the dueDate field null or omit it

OUTPUT FORMAT (valid JSON only, use as a reference for structure and field names, actual content will vary based on input):
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
        "sourceId": "<INSERT_ID_FROM_LIST_ABOVE>",
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

  /**
   * Parse and validate LLM JSON response
   */
  protected parseResponse<T>(response: string, schema?: z.ZodSchema<T>): T {
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;

      let parsed = JSON.parse(jsonStr.trim());

      // Normalize null values to undefined for optional fields
      parsed = this.normalizeNullValues(parsed);

      // Validate against schema if provided
      if (schema) {
        const result = schema.safeParse(parsed);
        if (!result.success) {
          throw new Error(`LLM response validation failed: ${result.error.message}`);
        }
        return result.data;
      }

      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  /**
   * Recursively normalize null values to undefined
   */
  private normalizeNullValues(obj: any): any {
    if (obj === null) {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeNullValues(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      const normalized: any = {};
      for (const key in obj) {
        normalized[key] = this.normalizeNullValues(obj[key]);
      }
      return normalized;
    }
    return obj;
  }
}
