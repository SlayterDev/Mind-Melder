import type { LLMProvider } from 'llm';
import type { Database } from 'database';
import type { Todo } from 'database';
import {
  CapturesRepository,
  TodosRepository,
  TemplatesRepository,
} from 'database';
import { templateTools } from '../utils/template-tools';

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

  /**
   * Generate a Today Sheet from unorganized captures and pending todos
   */
  async generateSheet(
    userId: string,
    templateId?: string
  ): Promise<TodaySheet> {
    // 1. Gather inputs
    const captures = await this.capturesRepo.findUnorganized(userId);
    const existingTodos = await this.todosRepo.findByStatus(userId, 'pending');

    // 2. Get template (use provided ID or first active template)
    let template;
    if (templateId) {
      template = await this.templatesRepo.findById(templateId);
      if (!template || template.userId !== userId) {
        throw new Error('Template not found or unauthorized');
      }
    } else {
      const activeTemplates = await this.templatesRepo.findActive(userId);
      template = activeTemplates[0] || templateTools.defaultTemplate;

      if (!template) {
        throw new Error('No active template found. Please create a template first.');
      }
    }

    // 3. Call LLM to generate Today Sheet
    const aiResult = await this.llmProvider.generateTodaySheet({
      captures,
      existingTodos,
      template,
      context: {
        currentTimeOfDay: new Date().getHours(),
        workingHoursMinutes: 480, // 8 hours default
        currentDate: new Date().toISOString().split('T')[0],
      },
    });

    // 4. Clear existing today sheet items (set section to 'none')
    const existingSheetTodoIds = existingTodos
      .filter(t => t.todaySheetSection !== 'none')
      .map(t => t.id);
    if (existingSheetTodoIds.length > 0) {
      await this.todosRepo.removeFromTodaySheet(existingSheetTodoIds);
    }

    // 5. Create/update todos from AI result
    const createdTodos: Record<string, Todo[]> = {
      must_do_today: [],
      likely_today: [],
      opportunistic: [],
      overflow: [],
    };

    for (const [section, items] of Object.entries(aiResult.sections)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Check if this todo already exists (from existingTodos)
        let todo;
        if (item.sourceType === 'todo') {
          todo = await this.todosRepo.findById(item.sourceId);
          if (todo) {
            // Update existing todo with today sheet metadata
            todo = await this.todosRepo.update(item.sourceId, {
              content: item.title,
              todaySheetSection: section as any,
              todaySheetOrder: i,
              timeEstimate: item.timeEstimate as any,
              priorityScore: item.priorityScore,
              tags: item.tags,
              dueDate: item.dueDate ? new Date(item.dueDate) : todo.dueDate,
            });
          }
        }

        // Create new todo if not found
        if (!todo) {
          todo = await this.todosRepo.create({
            userId,
            content: item.title,
            todaySheetSection: section as any,
            todaySheetOrder: i,
            timeEstimate: item.timeEstimate as any,
            priorityScore: item.priorityScore,
            tags: item.tags,
            captureId: item.sourceType === 'capture' ? item.sourceId : null,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          });
        }

        createdTodos[section].push(todo);
      }
    }

    // 6. Mark captures as organized
    for (const capture of captures) {
      await this.capturesRepo.markAsOrganized(capture.id);
    }

    return {
      summary: aiResult.summary,
      sections: createdTodos,
      totalEstimatedMinutes: aiResult.totalEstimatedMinutes,
      capturesProcessed: captures.length,
      todosIncluded: existingTodos.length,
    };
  }

  /**
   * Get the current Today Sheet for a user
   */
  async getSheet(userId: string): Promise<TodaySheet | null> {
    const todos = await this.todosRepo.findInTodaySheet(userId);

    if (todos.length === 0) {
      return null;
    }

    // Group by section
    const sections = {
      must_do_today: todos.filter(t => t.todaySheetSection === 'must_do_today'),
      likely_today: todos.filter(t => t.todaySheetSection === 'likely_today'),
      opportunistic: todos.filter(t => t.todaySheetSection === 'opportunistic'),
      overflow: todos.filter(t => t.todaySheetSection === 'overflow'),
    };

    // Calculate total estimated time
    const timeEstimateMinutes: Record<string, number> = {
      quick: 10,
      medium: 45,
      long: 90,
      none: 0
    };
    const totalEstimatedMinutes = todos.reduce((sum, t) =>
      sum + (timeEstimateMinutes[t.timeEstimate || 'none'] || 0), 0
    );

    return {
      summary: '', // Not stored in MVP, would need separate metadata table
      sections,
      totalEstimatedMinutes,
      capturesProcessed: 0,
      todosIncluded: todos.length,
    };
  }
}
