import type { LLMProvider } from 'llm';
import type { Database } from 'database';
import type { Todo } from 'database';
import {
  CapturesRepository,
  TodosRepository,
  TemplatesRepository,
  TodaySheetsRepository,
  TagsRepository,
} from 'database';
import { templateTools } from '../utils/template-tools.js';

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
  generatedAt?: string; // ISO timestamp when the sheet was generated
}

export class TodaySheetService {
  private capturesRepo: CapturesRepository;
  private todosRepo: TodosRepository;
  private templatesRepo: TemplatesRepository;
  private todaySheetsRepo: TodaySheetsRepository;
  private tagsRepo: TagsRepository;

  constructor(
    private db: Database,
    private llmProvider: LLMProvider
  ) {
    this.capturesRepo = new CapturesRepository(db);
    this.todosRepo = new TodosRepository(db);
    this.templatesRepo = new TemplatesRepository(db);
    this.todaySheetsRepo = new TodaySheetsRepository(db);
    this.tagsRepo = new TagsRepository(db);
  }

  /**
   * Generate a Today Sheet from unorganized captures and pending todos
   */
  async generateSheet(
    userId: string,
    templateId?: string,
    contentLockEnabled: boolean = false,
    includeTagDescriptions: boolean = false
  ): Promise<TodaySheet> {
    // 1. Gather inputs
    const captures = await this.capturesRepo.findUnorganized(userId);
    const existingTodos = await this.todosRepo.findByStatus(userId, 'pending');
    const feedbackTodos = await this.todosRepo.findWithFeedback(userId);

    // 2. Get template (use provided ID or active template or default)
    let template;
    if (templateId) {
      template = await this.templatesRepo.findById(templateId);
      if (!template || template.userId !== userId) {
        throw new Error('Template not found or unauthorized');
      }
    } else {
      // Use the active template, or fall back to default if no templates exist
      const activeTemplate = await this.templatesRepo.findActiveTemplate(userId);
      template = activeTemplate || templateTools.defaultTemplate;
    }

    // 2.5. Fetch user's tags for categorization
    const userTags = await this.tagsRepo.findByUserId(userId);

    // 3. Call LLM to generate Today Sheet
    let aiResult;
    try {
      aiResult = await this.llmProvider.generateTodaySheet({
        captures,
        existingTodos,
        feedbackTodos,
        template,
        tags: userTags,
        includeDescriptions: includeTagDescriptions,
        contentLockEnabled,
        context: {
          currentTimeOfDay: new Date().getHours(),
          workingHoursMinutes: 480, // 8 hours default
          currentDate: new Date().toISOString().split('T')[0],
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation failed')) {
        throw new Error('AI returned invalid response format. Please try again.');
      }
      throw error;
    }

    // 4. Create today_sheets record to persist summary and metadata
    const todaySheet = await this.todaySheetsRepo.create({
      userId,
      summary: aiResult.summary,
      capturesProcessed: captures.length,
      todosIncluded: existingTodos.length,
      totalEstimatedMinutes: aiResult.totalEstimatedMinutes,
    });

    // 5. Clear existing today sheet items (set section to 'none')
    const existingSheetTodoIds = existingTodos
      .filter(t => t.todaySheetSection !== 'none')
      .map(t => t.id);
    if (existingSheetTodoIds.length > 0) {
      await this.todosRepo.removeFromTodaySheet(existingSheetTodoIds);
    }
    await this.todosRepo.removeCompletedFromTodaySheet(userId);

    // 6. Create/update todos from AI result
    const createdTodos: {
      must_do_today: Todo[];
      likely_today: Todo[];
      opportunistic: Todo[];
      overflow: Todo[];
    } = {
      must_do_today: [],
      likely_today: [],
      opportunistic: [],
      overflow: [],
    };

    // Build sets of valid IDs for validation
    const validCaptureIds = new Set(captures.map(c => c.id));
    const validTodoIds = new Set(existingTodos.map(t => t.id));

    for (const [section, items] of Object.entries(aiResult.sections)) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Validate sourceId exists in our input data
        if (item.sourceType === 'capture' && !validCaptureIds.has(item.sourceId)) {
          console.warn(
            `Skipping item "${item.title}": LLM returned invalid capture sourceId "${item.sourceId}" ` +
            `(not in ${validCaptureIds.size} valid captures)`
          );
          continue;
        }
        if (item.sourceType === 'todo' && !validTodoIds.has(item.sourceId)) {
          console.warn(
            `Skipping item "${item.title}": LLM returned invalid todo sourceId "${item.sourceId}" ` +
            `(not in ${validTodoIds.size} valid todos)`
          );
          continue;
        }

        // Check if this todo already exists (from existingTodos)
        let todo;
        if (item.sourceType === 'todo') {
          todo = await this.todosRepo.findById(item.sourceId);
          if (todo) {
            // Update existing todo with today sheet metadata
            const updateData: Record<string, any> = {
              todaySheetSection: section as any,
              todaySheetOrder: i,
              todaySheetId: todaySheet.id,
              timeEstimate: item.timeEstimate as any,
              priorityScore: Math.round(item.priorityScore),
              tags: item.tags,
              dueDate: todo.dueDate || (item.dueDate ? new Date(item.dueDate) : null),
              feedbackVote: 'none',
              feedbackText: null,
              feedbackTimestamp: null
            };

            if (contentLockEnabled) {
              // Content lock: preserve title; only set description if todo has none
              if (!todo.description && item.description) {
                updateData.description = item.description;
              }
            } else {
              updateData.content = item.title;
              updateData.description = item.description;
            }

            todo = await this.todosRepo.update(item.sourceId, updateData);
          }
        }

        // Create new todo if not found
        if (!todo) {
          // When content lock is on, use original capture text as title
          let title = item.title;
          if (contentLockEnabled && item.sourceType === 'capture') {
            const originalCapture = captures.find(c => c.id === item.sourceId);
            if (originalCapture) {
              title = originalCapture.content;
            }
          }

          todo = await this.todosRepo.create({
            userId,
            content: title,
            description: item.description,
            todaySheetSection: section as any,
            todaySheetOrder: i,
            todaySheetId: todaySheet.id,
            timeEstimate: item.timeEstimate as any,
            priorityScore: item.priorityScore,
            tags: item.tags,
            captureId: item.sourceType === 'capture' ? item.sourceId : null,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          });
        }

        (createdTodos as any)[section].push(todo);
      }
    }

    // 7. Mark captures as organized
    for (const capture of captures) {
      await this.capturesRepo.markAsOrganized(capture.id);
    }

    return {
      summary: aiResult.summary,
      sections: createdTodos,
      totalEstimatedMinutes: aiResult.totalEstimatedMinutes,
      capturesProcessed: captures.length,
      todosIncluded: existingTodos.length,
      generatedAt: todaySheet.generatedAt.toISOString(),
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

    // Fetch the latest today sheet for summary and metadata
    const latestSheet = await this.todaySheetsRepo.findLatest(userId);

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
      summary: latestSheet?.summary || '',
      sections,
      totalEstimatedMinutes,
      capturesProcessed: latestSheet?.capturesProcessed || 0,
      todosIncluded: todos.length,
      generatedAt: latestSheet?.generatedAt.toISOString(),
    };
  }
}
