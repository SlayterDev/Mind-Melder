import type { LLMProvider } from 'llm';
import type { Database } from 'database';
import {
  CapturesRepository,
  OrganizedNotesRepository,
  TodosRepository,
  TemplatesRepository,
} from 'database';
import type { OrganizationResult } from 'types';
import { templateTools } from '../utils/template-tools.js';

export class OrganizationService {
  private capturesRepo: CapturesRepository;
  private notesRepo: OrganizedNotesRepository;
  private todosRepo: TodosRepository;
  private templatesRepo: TemplatesRepository;

  constructor(
    private db: Database,
    private llmProvider: LLMProvider
  ) {
    this.capturesRepo = new CapturesRepository(db);
    this.notesRepo = new OrganizedNotesRepository(db);
    this.todosRepo = new TodosRepository(db);
    this.templatesRepo = new TemplatesRepository(db);
  }

  /**
   * Organize unorganized captures for a user using LLM
   */
  async organizeCaptures(
    userId: string,
    templateId?: string
  ): Promise<OrganizationResult> {
    // Get unorganized captures
    const captures = await this.capturesRepo.findUnorganized(userId);

    if (captures.length === 0) {
      return {
        capturesProcessed: 0,
        organizedNotesCount: 0,
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

    // Use LLM to organize
    const organized = await this.llmProvider.organize(captures, template);

    // Create organized notes
    const createdNotes = await Promise.all(
      organized.notes.map((note) =>
        this.notesRepo.create({
          content: note.content,
          category: note.category,
          userId,
        })
      )
    );

    // Create todos
    const createdTodos = await Promise.all(
      organized.todos.map((todo) =>
        this.todosRepo.create({
          content: todo.content,
          dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
          userId,
        })
      )
    );

    // Mark captures as organized
    await Promise.all(captures.map((capture) => this.capturesRepo.markAsOrganized(capture.id)));

    return {
      capturesProcessed: captures.length,
      organizedNotesCount: createdNotes.length,
      todosCount: createdTodos.length,
    };
  }
}
