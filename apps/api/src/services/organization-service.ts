import type { LLMProvider } from 'llm';
import type { Database } from 'database';
import {
  CapturesRepository,
  TodosRepository,
  TemplatesRepository,
  TagsRepository,
} from 'database';
import type { OrganizationResult } from 'types';
import { templateTools } from '../utils/template-tools.js';

export class OrganizationService {
  private capturesRepo: CapturesRepository;
  private todosRepo: TodosRepository;
  private templatesRepo: TemplatesRepository;
  private tagsRepo: TagsRepository;

  constructor(
    private db: Database,
    private llmProvider: LLMProvider
  ) {
    this.capturesRepo = new CapturesRepository(db);
    this.todosRepo = new TodosRepository(db);
    this.templatesRepo = new TemplatesRepository(db);
    this.tagsRepo = new TagsRepository(db);
  }

  /**
   * Organize unorganized captures for a user using LLM
   */
  async organizeCaptures(
    userId: string,
    templateId?: string,
    contentLockEnabled: boolean = false,
    includeTagDescriptions: boolean = false
  ): Promise<OrganizationResult> {
    // Get unorganized captures
    const captures = await this.capturesRepo.findUnorganized(userId);

    if (captures.length === 0) {
      return {
        capturesProcessed: 0,
        todosCount: 0,
      };
    }

    // Get template (use provided ID or active template or default)
    let template;
    if (templateId) {
      template = await this.templatesRepo.findById(templateId);
      if (!template || template.userId !== userId) {
        throw new Error('Template not found');
      }
    } else {
      // Use the active template, or fall back to default if no templates exist
      const activeTemplate = await this.templatesRepo.findActiveTemplate(userId);
      template = activeTemplate || templateTools.defaultTemplate;
    }

    // Fetch user's tags for categorization
    const userTags = await this.tagsRepo.findByUserId(userId);

    // Use LLM to extract todos
    const organized = await this.llmProvider.organize(captures, template, userTags, includeTagDescriptions, contentLockEnabled);

    // Create todos - handle case where todos might be undefined or missing
    const todos = organized.todos || [];
    const createdTodos = await Promise.all(
      todos.map((todo) => {
        // When content lock is on, use original capture text as title
        let title = todo.title;
        if (contentLockEnabled && todo.sourceType === 'capture') {
          const originalCapture = captures.find(c => c.id === todo.sourceId);
          if (originalCapture) {
            title = originalCapture.content;
          }
        }

        return this.todosRepo.create({
          content: title,
          description: todo.description,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
          timeEstimate: todo.timeEstimate,
          priorityScore: todo.priorityScore != null ? Math.round(todo.priorityScore) : undefined,
          tags: todo.tags,
          userId,
        });
      })
    );

    // Mark captures as organized
    await Promise.all(captures.map((capture) => this.capturesRepo.markAsOrganized(capture.id)));

    return {
      capturesProcessed: captures.length,
      todosCount: createdTodos.length,
    };
  }
}
