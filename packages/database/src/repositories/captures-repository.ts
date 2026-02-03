import { eq, isNull, and, sql } from 'drizzle-orm';
import { captures, type Capture, type NewCapture } from '../schema/captures.js';
import type { Database } from '../client.js';

export class CapturesRepository {
  constructor(private db: Database) {}

  async create(data: NewCapture): Promise<Capture> {
    const [capture] = await this.db.insert(captures).values(data).returning();
    return capture;
  }

  async findById(id: string): Promise<Capture | undefined> {
    const [capture] = await this.db.select().from(captures).where(eq(captures.id, id));
    return capture;
  }

  async findByUserId(userId: string): Promise<Capture[]> {
    return this.db.select().from(captures).where(eq(captures.userId, userId));
  }

  async findUnorganized(userId: string): Promise<Capture[]> {
    return this.db
      .select()
      .from(captures)
      .where(and(eq(captures.userId, userId), isNull(captures.organized)));
  }

  async markAsOrganized(id: string): Promise<Capture | undefined> {
    const [capture] = await this.db
      .update(captures)
      .set({ organized: new Date(), updatedAt: new Date() })
      .where(eq(captures.id, id))
      .returning();
    return capture;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(captures).where(eq(captures.id, id));
  }

  async search(userId: string, query: string): Promise<Capture[]> {
    if (!query.trim()) {
      return [];
    }

    return this.db
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.userId, userId),
          sql`${captures}.search_vector @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(
        sql`ts_rank(${captures}.search_vector, plainto_tsquery('english', ${query})) DESC`
      );
  }
}
