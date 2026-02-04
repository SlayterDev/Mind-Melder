import {
  Database,
  CapturesRepository,
  TodosRepository,
  OrganizedNotesRepository,
} from 'database';

export type SearchType = 'captures' | 'todos' | 'notes' | 'all';

export interface SearchResults {
  captures?: Array<{ type: 'capture'; [key: string]: unknown }>;
  todos?: Array<{ type: 'todo'; [key: string]: unknown }>;
  notes?: Array<{ type: 'note'; [key: string]: unknown }>;
}

export class SearchService {
  private capturesRepo: CapturesRepository;
  private todosRepo: TodosRepository;
  private notesRepo: OrganizedNotesRepository;

  constructor(db: Database) {
    this.capturesRepo = new CapturesRepository(db);
    this.todosRepo = new TodosRepository(db);
    this.notesRepo = new OrganizedNotesRepository(db);
  }

  /**
   * Search across captures, todos, and notes
   */
  async search(userId: string, query: string, type: SearchType = 'all'): Promise<SearchResults> {
    const results: SearchResults = {};

    if (type === 'all' || type === 'captures') {
      const captures = await this.capturesRepo.search(userId, query);
      results.captures = captures.map((c) => ({
        ...c,
        type: 'capture' as const,
      }));
    }

    if (type === 'all' || type === 'todos') {
      const todos = await this.todosRepo.search(userId, query);
      results.todos = todos.map((t) => ({
        ...t,
        type: 'todo' as const,
      }));
    }

    if (type === 'all' || type === 'notes') {
      const notes = await this.notesRepo.search(userId, query);
      results.notes = notes.map((n) => ({
        ...n,
        type: 'note' as const,
      }));
    }

    return results;
  }
}
