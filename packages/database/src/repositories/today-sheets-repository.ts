import { eq, desc } from 'drizzle-orm';
import { todaySheets, type TodaySheet, type NewTodaySheet } from '../schema/today-sheets.js';
import type { Database } from '../client.js';

export class TodaySheetsRepository {
  constructor(private db: Database) {}

  async create(data: NewTodaySheet): Promise<TodaySheet> {
    const [sheet] = await this.db.insert(todaySheets).values(data).returning();
    return sheet;
  }

  async findById(id: string): Promise<TodaySheet | undefined> {
    const [sheet] = await this.db.select().from(todaySheets).where(eq(todaySheets.id, id));
    return sheet;
  }

  async findByUserId(userId: string): Promise<TodaySheet[]> {
    return this.db
      .select()
      .from(todaySheets)
      .where(eq(todaySheets.userId, userId))
      .orderBy(desc(todaySheets.generatedAt));
  }

  /**
   * Get the most recent today sheet for a user
   */
  async findLatest(userId: string): Promise<TodaySheet | undefined> {
    const [sheet] = await this.db
      .select()
      .from(todaySheets)
      .where(eq(todaySheets.userId, userId))
      .orderBy(desc(todaySheets.generatedAt))
      .limit(1);
    return sheet;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(todaySheets).where(eq(todaySheets.id, id));
  }
}
