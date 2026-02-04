import { Database, TodosRepository, CapturesRepository } from "database";
import { SearchService } from "./search-service.js";

interface SearchToolInput {
    query: string;
    type?: 'captures' | 'todos' | 'notes' | 'all';
    limit?: number;
}

interface GetTodaysTodosInput {
    include_completed?: boolean;
}

interface GetRecentCapturesInput {
    limit?: number;
    hours?: number;
}

export class ChatToolExecutor {
    private searchService: SearchService;
    private todoRepository: TodosRepository;
    private captureRepository: CapturesRepository;

    constructor(db: Database) {
        this.searchService = new SearchService(db);
        this.todoRepository = new TodosRepository(db);
        this.captureRepository = new CapturesRepository(db);
    }

    async executeTool(
        userId: string,
        toolName: string,
        toolInput: Record<string, any>
    ): Promise<string> {
        switch (toolName) {
            case 'search_user_content':
                return await this.handleSearchContent(userId, toolInput as SearchToolInput);
            case 'get_todays_todos':
                return await this.handleGetTodaysTodos(userId, toolInput as GetTodaysTodosInput);
            case 'get_recent_captures':
                return await this.handleGetRecentCaptures(userId, toolInput as GetRecentCapturesInput);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async handleSearchContent(
        userId: string,
        input: { query: string; type?: 'captures' | 'todos' | 'notes' | 'all', limit?: number }
    ): Promise<string> {
        const results = await this.searchService.search(userId, input.query, input.type || 'all');

        if (results.captures?.length === 0 && results.todos?.length === 0 && results.notes?.length === 0) {
            return 'No relevant content found.';
        }

        // Format results
        let output = 'Search Results:\n';

        if (results.captures) {
            output += `\nCaptures:\n`;
            results.captures.slice(0, input.limit || 8).forEach((capture, index) => {
                output += `${index + 1}. (${capture.createdAt.toISOString()}) ${capture.content}\n`;
            });
        }

        if (results.todos) {
            output += `\nTodos:\n`;
            results.todos.slice(0, input.limit || 8).forEach((todo, index) => {
                output += `${index + 1}. (${todo.dueDate ? "Due: " + todo.dueDate?.toISOString() : 'No due date'}) ${todo.content} - ${todo.status === 'completed' ? 'Completed' : 'Pending'}${todo.description ? ' - ' + todo.description : ''}\n`;
            });
        }

        if (results.notes) {
            output += `\nNotes:\n`;
            results.notes.slice(0, input.limit || 8).forEach((note, index) => {
                output += `${index + 1}. ${note.title} - ${note.content.slice(0, 100)}\n`;
            });
        }

        return output;
    }

    private async handleGetTodaysTodos(
        userId: string,
        input: GetTodaysTodosInput
    ): Promise<string> {
        const todos = await this.todoRepository.findDueToday(userId, input.include_completed || false);
        if (todos.length === 0) {
            return 'No todos due today.';
        }

        let output = 'Today\'s Todos:\n';
        todos.forEach((todo, index) => {
            const dueDate = todo.dueDate ? (todo.dueDate instanceof Date ? todo.dueDate : new Date(todo.dueDate as string)) : null;
            output += `${index + 1}. (${dueDate ? "Due: " + dueDate.toISOString() : 'No due date'}) ${todo.content} - ${todo.status === 'completed' ? 'Completed' : 'Pending'} - ${todo.description}\n`;
        });

        return output;
    }

    private async handleGetRecentCaptures(
        userId: string,
        input: GetRecentCapturesInput
    ): Promise<string> {
        const limit = input.limit || 10;
        const hours = input.hours;

        // Compute optional cutoff time if hours is provided and positive
        const cutoff: Date | undefined =
            typeof hours === 'number' && hours > 0
                ? new Date(Date.now() - hours * 60 * 60 * 1000)
                : undefined;

        // Fetch unorganized captures, filtered and sorted by the database
        const captures = await this.captureRepository.findUnorganized(userId, cutoff);
        
        // Apply limit after database returns sorted results
        const limitedCaptures = captures.slice(0, limit);

        if (limitedCaptures.length === 0) {
            return 'No recent captures found.';
        }

        let output = 'Recent Captures:\n';
        limitedCaptures.forEach((capture, index) => {
            const createdAt =
                capture.createdAt instanceof Date
                    ? capture.createdAt
                    : new Date(capture.createdAt as string);
            output += `${index + 1}. (${createdAt.toISOString()}) ${capture.content}\n`;
        });

        return output;
    }
}
