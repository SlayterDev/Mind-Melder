import { eq, and, desc, ne, asc, inArray } from 'drizzle-orm';
import { todos, type Todo, type NewTodo } from '../schema/todos.js';
import type { Database } from '../client.js';

export class TodosRepository {
  constructor(private db: Database) {}

  async create(data: NewTodo): Promise<Todo> {
    const [todo] = await this.db.insert(todos).values(data).returning();
    return todo;
  }

  async findById(id: string): Promise<Todo | undefined> {
    const [todo] = await this.db.select().from(todos).where(eq(todos.id, id));
    return todo;
  }

  async findByUserId(userId: string): Promise<Todo[]> {
    return this.db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(desc(todos.createdAt));
  }

  async findByStatus(
    userId: string,
    status: 'pending' | 'completed'
  ): Promise<Todo[]> {
    return this.db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.status, status)))
      .orderBy(desc(todos.createdAt));
  }

  async update(
    id: string,
    data: Partial<Omit<Todo, 'id' | 'createdAt'>>
  ): Promise<Todo | undefined> {
    const [todo] = await this.db
      .update(todos)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  async markAsCompleted(id: string): Promise<Todo | undefined> {
    const [todo] = await this.db
      .update(todos)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(eq(todos.id, id))
      .returning();
    return todo;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(todos).where(eq(todos.id, id));
  }

  /**
   * Get all todos in today's sheet, ordered by section and order
   */
  async findInTodaySheet(userId: string): Promise<Todo[]> {
    return this.db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          ne(todos.todaySheetSection, 'none')
        )
      )
      .orderBy(asc(todos.todaySheetOrder));
  }

  /**
   * Bulk update positions for drag-and-drop
   */
  async updatePositions(
    updates: Array<{ id: string; section: string; order: number }>
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(todos)
          .set({
            todaySheetSection: update.section as any, // Type assertion for enum
            todaySheetOrder: update.order,
            updatedAt: new Date()
          })
          .where(eq(todos.id, update.id));
      }
    });
  }

  /**
   * Remove todos from today sheet (set section to 'none')
   */
  async removeFromTodaySheet(ids: string[]): Promise<void> {
    await this.db
      .update(todos)
      .set({
        todaySheetSection: 'none' as any,
        todaySheetOrder: null,
        updatedAt: new Date()
      })
      .where(inArray(todos.id, ids));
  }
}
