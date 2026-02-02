import { eq } from 'drizzle-orm';
import { tags, type Tag, type NewTag } from '../schema/tags.js';
import type { Database } from '../client.js';

export class TagsRepository {
  constructor(private db: Database) {}

  async create(data: NewTag): Promise<Tag> {
    const [tag] = await this.db.insert(tags).values(data).returning();
    return tag;
  }

  async findById(id: string): Promise<Tag | undefined> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async findByUserId(userId: string): Promise<Tag[]> {
    return this.db.select().from(tags).where(eq(tags.userId, userId));
  }

  async update(id: string, data: Partial<Omit<Tag, 'id' | 'createdAt'>>): Promise<Tag | undefined> {
    const [tag] = await this.db
      .update(tags)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tags.id, id))
      .returning();
    return tag;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(tags).where(eq(tags.id, id));
  }
}
