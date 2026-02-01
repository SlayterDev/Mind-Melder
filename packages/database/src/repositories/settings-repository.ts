import { eq } from 'drizzle-orm';
import { settings, type Settings } from '../schema/settings.js';
import type { Database } from '../client.js';

export class SettingsRepository {
  constructor(private db: Database) {}

  async getOrCreate(userId: string): Promise<Settings> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const [created] = await this.db
      .insert(settings)
      .values({ userId })
      .returning();
    return created;
  }

  async findByUserId(userId: string): Promise<Settings | undefined> {
    const [result] = await this.db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId));
    return result;
  }

  async update(
    userId: string,
    data: Partial<Omit<Settings, 'id' | 'userId' | 'createdAt'>>
  ): Promise<Settings | undefined> {
    const [result] = await this.db
      .update(settings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(settings.userId, userId))
      .returning();
    return result;
  }
}
