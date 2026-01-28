import type { Capture, Template } from 'types';

export abstract class BaseLLMProvider {
  /**
   * Build the system prompt for organization
   */
  protected buildSystemPrompt(): string {
    return `You are an AI assistant that helps organize notes and extract actionable tasks.
Your job is to:
1. Read through a batch of captured notes
2. Organize them into coherent, structured notes grouped by theme or topic
3. Extract any actionable tasks or todos from the content
4. Follow the user's template instructions for organization style

Always respond with valid JSON in this exact format:
{
  "notes": [
    {"content": "organized note text", "category": "optional category"}
  ],
  "todos": [
    {"content": "actionable task", "dueDate": "optional ISO date string"}
  ]
}`;
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
