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
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OrganizationService');

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
    logger.info('Starting capture organization', { userId, templateId, contentLockEnabled });

    // Get unorganized captures
    const captures = await this.capturesRepo.findUnorganized(userId);

    if (captures.length === 0) {
      logger.info('No unorganized captures found, skipping', { userId });
      return {
        capturesProcessed: 0,
        todosCount: 0,
      };
    }

    logger.debug('Fetched unorganized captures', { userId, captureCount: captures.length });

    // Get template (use provided ID or active template or default)
    let template;
    if (templateId) {
      template = await this.templatesRepo.findById(templateId);
      if (!template || template.userId !== userId) {
        logger.warn('Template not found or unauthorized', { userId, templateId });
        throw new Error('Template not found');
      }
      logger.debug('Using specified template', { userId, templateId, templateName: template.name });
    } else {
      // Use the active template, or fall back to default if no templates exist
      const activeTemplate = await this.templatesRepo.findActiveTemplate(userId);
      template = activeTemplate || templateTools.defaultTemplate;
      logger.debug('Using template', {
        userId,
        templateName: template.name,
        source: activeTemplate ? 'active' : 'default',
      });
    }

    // Fetch user's tags for categorization
    const userTags = await this.tagsRepo.findByUserId(userId);
    logger.debug('Fetched user tags', { userId, tagCount: userTags.length });

    // Use LLM to extract todos
    logger.info('Calling LLM for organization', { userId, captureCount: captures.length, includeTagDescriptions });
    const organized = await this.llmProvider.organize(captures, template, userTags, includeTagDescriptions, contentLockEnabled);

    // Create todos - handle case where todos might be undefined or missing
    const todos = organized.todos || [];
    logger.debug('LLM returned todos', { userId, todoCount: todos.length });

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

    logger.info('Organization complete', {
      userId,
      capturesProcessed: captures.length,
      todosCreated: createdTodos.length,
    });

    return {
      capturesProcessed: captures.length,
      todosCount: createdTodos.length,
    };
  }
}
