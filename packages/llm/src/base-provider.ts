import type { Capture, Template } from 'types';
import type { TodaySheetInput } from './types';

export abstract class BaseLLMProvider {
  /**
   * Build the system prompt for organization
   */
  protected buildSystemPrompt(): string {
    return `You are an AI assistant that helps organize notes and extract actionable tasks.
Your job is to:
1. Read through a batch of captured notes, which may be unstructured, messy, incomplete, or in short form
2. Organize them into coherent, structured todos or notes grouped by theme or topic. This may involve rewriting for clarity and completeness.
3. Extract any actionable tasks or todos from the content
4. Follow the user's template instructions for organization style
`;
  }

  /**
   * Build the user prompt with captures and template
   */
  protected buildOrganizePrompt(captures: Capture[], template: Template): string {
    const captureList = captures
      .map((c, i) => `${i + 1}. [${new Date(c.timestamp).toLocaleString()}] ${c.content}`)
      .join('\n');

    return `Here are ${captures.length} captured notes to organize:

${captureList}

Organization instructions:
${template.prompt}

Please organize these notes and extract any todos. Return valid JSON only.`;
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

USER TEMPLATE:
${input.template.prompt}

YOUR TASK:
1. Extract actionable tasks from captures (skip pure notes/info)
2. Minimally rephrase capture content for task coherency and clarity
3. Include relevant existing todos
4. Prioritize by: due dates (today/overdue highest), importance, effort, available time
5. Assign to sections:
   - must_do_today: Due today/overdue, critical items (3-7 max)
   - likely_today: Important, high-impact, fits capacity
   - opportunistic: Nice-to-have, quick wins, no urgency
   - overflow: Defer to later this week
6. Time estimates: quick (<15min), medium (30-60min), long (>90min)
7. Generate 1-2 sentence summary of day's focus

CRITICAL RULE FOR sourceId:
- You MUST use the exact ID from the input lists above (copy the UUID after "ID:")
- For captures, use sourceType="capture" and copy the ID from the captures list
- For todos, use sourceType="todo" and copy the ID from the todos list
- NEVER generate new IDs or use numbers like "1", "2", etc.

OUTPUT FORMAT (valid JSON only):
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
        "sourceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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
  protected parseResponse<T>(response: string): T {
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;

      return JSON.parse(jsonStr.trim());
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }
}
