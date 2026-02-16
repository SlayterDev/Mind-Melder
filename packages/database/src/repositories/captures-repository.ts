import { eq, isNull, and, sql } from 'drizzle-orm';
import { captures, type Capture, type NewCapture } from '../schema/captures.js';
import type { Database } from '../client.js';
import { buildPrefixSearchQuery } from '../utils/search.js';

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

  async findByUserId(userId: string, limit?: number): Promise<Capture[]> {
    const query = this.db
      .select()
      .from(captures)
      .where(eq(captures.userId, userId))
      .orderBy(sql`${captures.createdAt} DESC`);
    
    return limit !== undefined ? query.limit(limit) : query;
  }

  async findUnorganized(userId: string, since?: Date): Promise<Capture[]> {
    const conditions = [
      eq(captures.userId, userId),
      isNull(captures.organized)
    ];
    
    if (since) {
      conditions.push(sql`${captures.createdAt} >= ${since}`);
    }
    
    return this.db
      .select()
      .from(captures)
      .where(and(...conditions))
      .orderBy(sql`${captures.createdAt} DESC`);
  }

  async update(id: string, data: Partial<Pick<Capture, 'content' | 'metadata'>>): Promise<Capture | undefined> {
    const [capture] = await this.db
      .update(captures)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(captures.id, id))
      .returning();
    return capture;
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

    const prefixQuery = buildPrefixSearchQuery(query);
    if (!prefixQuery) {
      // All terms were filtered out (e.g., input contained only special characters)
      return [];
    }

    return this.db
      .select()
      .from(captures)
      .where(
        and(
          eq(captures.userId, userId),
          sql`${captures}.search_vector @@ to_tsquery('english', ${prefixQuery})`
        )
      )
      .orderBy(
        sql`ts_rank(${captures}.search_vector, to_tsquery('english', ${prefixQuery})) DESC`
      );
  }
}
