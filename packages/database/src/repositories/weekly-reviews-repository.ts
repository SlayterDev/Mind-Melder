import { eq, and, desc, sql } from 'drizzle-orm';
import { weeklyReviews, type WeeklyReview, type NewWeeklyReview } from '../schema/weekly-reviews.js';
import type { Database } from '../client.js';

export class WeeklyReviewsRepository {
  constructor(private db: Database) {}

  async create(data: NewWeeklyReview): Promise<WeeklyReview> {
    const [review] = await this.db.insert(weeklyReviews).values(data).returning();
    return review;
  }

  async findById(id: string): Promise<WeeklyReview | undefined> {
    const [review] = await this.db
      .select()
      .from(weeklyReviews)
      .where(eq(weeklyReviews.id, id));
    return review;
  }

  async findByUserId(userId: string, page: number = 1, perPage: number = 10): Promise<WeeklyReview[]> {
    return this.db
      .select()
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, userId))
      .orderBy(desc(weeklyReviews.weekStartDate))
      .limit(perPage)
      .offset((page - 1) * perPage);
  }

  async findLatestByUserId(userId: string): Promise<WeeklyReview | undefined> {
    const [review] = await this.db
      .select()
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, userId))
      .orderBy(desc(weeklyReviews.weekStartDate))
      .limit(1);
    return review;
  }

  async findByWeek(userId: string, weekStartDate: string): Promise<WeeklyReview | undefined> {
    const [review] = await this.db
      .select()
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, userId),
          eq(weeklyReviews.weekStartDate, weekStartDate)
        )
      );
    return review;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(weeklyReviews).where(eq(weeklyReviews.id, id));
  }

  async count(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(weeklyReviews)
      .where(eq(weeklyReviews.userId, userId));
    return result[0]?.count ?? 0;
  }
}
