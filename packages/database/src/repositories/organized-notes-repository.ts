import { eq, and, desc, sql } from 'drizzle-orm';
import {
  organizedNotes,
  type OrganizedNote,
  type NewOrganizedNote,
} from '../schema/organized-notes.js';
import type { Database } from '../client.js';

export class OrganizedNotesRepository {
  constructor(private db: Database) {}

  async create(data: NewOrganizedNote): Promise<OrganizedNote> {
    const [note] = await this.db.insert(organizedNotes).values(data).returning();
    return note;
  }

  async findById(id: string): Promise<OrganizedNote | undefined> {
    const [note] = await this.db.select().from(organizedNotes).where(eq(organizedNotes.id, id));
    return note;
  }

  async findByUserId(userId: string): Promise<OrganizedNote[]> {
    return this.db
      .select()
      .from(organizedNotes)
      .where(eq(organizedNotes.userId, userId))
      .orderBy(desc(organizedNotes.date));
  }

  async findByCategory(userId: string, category: string): Promise<OrganizedNote[]> {
    return this.db
      .select()
      .from(organizedNotes)
      .where(and(eq(organizedNotes.userId, userId), eq(organizedNotes.category, category)))
      .orderBy(desc(organizedNotes.date));
  }

  async findByTitle(userId: string, title: string): Promise<OrganizedNote[]> {
    return this.db
      .select()
      .from(organizedNotes)
      .where(and(eq(organizedNotes.userId, userId), eq(organizedNotes.title, title)))
      .orderBy(desc(organizedNotes.date));
  }

  async update(
    id: string,
    data: Partial<Omit<OrganizedNote, 'id' | 'createdAt'>>
  ): Promise<OrganizedNote | undefined> {
    const [note] = await this.db
      .update(organizedNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizedNotes.id, id))
      .returning();
    return note;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(organizedNotes).where(eq(organizedNotes.id, id));
  }

  async search(userId: string, query: string): Promise<OrganizedNote[]> {
    if (!query.trim()) {
      return [];
    }

    return this.db
      .select()
      .from(organizedNotes)
      .where(
        and(
          eq(organizedNotes.userId, userId),
          sql`${organizedNotes}.search_vector @@ plainto_tsquery('english', ${query})`
        )
      )
      .orderBy(
        sql`ts_rank(${organizedNotes}.search_vector, plainto_tsquery('english', ${query})) DESC`
      );
  }
}
