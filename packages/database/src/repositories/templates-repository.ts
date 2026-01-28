import { eq, and } from 'drizzle-orm';
import { templates, type Template, type NewTemplate } from '../schema/templates';
import type { Database } from '../client';

export class TemplatesRepository {
  constructor(private db: Database) {}

  async create(data: NewTemplate): Promise<Template> {
    const [template] = await this.db.insert(templates).values(data).returning();
    return template;
  }

  async findById(id: string): Promise<Template | undefined> {
    const [template] = await this.db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async findByUserId(userId: string): Promise<Template[]> {
    return this.db.select().from(templates).where(eq(templates.userId, userId));
  }

  async findActive(userId: string): Promise<Template[]> {
    return this.db
      .select()
      .from(templates)
      .where(and(eq(templates.userId, userId), eq(templates.isActive, true)));
  }

  async update(
    id: string,
    data: Partial<Omit<Template, 'id' | 'createdAt'>>
  ): Promise<Template | undefined> {
    const [template] = await this.db
      .update(templates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(templates).where(eq(templates.id, id));
  }
}
