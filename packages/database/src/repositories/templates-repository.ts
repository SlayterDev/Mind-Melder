import { eq, and } from 'drizzle-orm';
import { templates, type Template, type NewTemplate } from '../schema/templates.js';
import type { Database } from '../client.js';

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

  async findActiveTemplate(userId: string): Promise<Template | undefined> {
    const [template] = await this.db
      .select()
      .from(templates)
      .where(and(eq(templates.userId, userId), eq(templates.isActive, true)));
    return template;
  }

  async countByUserId(userId: string): Promise<number> {
    const userTemplates = await this.findByUserId(userId);
    return userTemplates.length;
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

  async setActive(id: string, userId: string): Promise<Template | undefined> {
    // First, deactivate all templates for this user
    await this.db
      .update(templates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(templates.userId, userId));

    // Then activate the specified template
    const [template] = await this.db
      .update(templates)
      .set({ isActive: true, updatedAt: new Date() })
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning();

    return template;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(templates).where(eq(templates.id, id));
  }
}
