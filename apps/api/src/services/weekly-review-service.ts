import type { LLMProvider, WeeklyReviewOutput } from 'llm';
import type { Database } from 'database';
import {
  CapturesRepository,
  TodosRepository,
  OrganizedNotesRepository,
  TodaySheetsRepository,
  WeeklyReviewsRepository,
  type WeeklyReview,
} from 'database';

export class WeeklyReviewService {
  private capturesRepo: CapturesRepository;
  private todosRepo: TodosRepository;
  private notesRepo: OrganizedNotesRepository;
  private todaySheetsRepo: TodaySheetsRepository;
  private weeklyReviewsRepo: WeeklyReviewsRepository;

  constructor(
    private db: Database,
    private llmProvider: LLMProvider
  ) {
    this.capturesRepo = new CapturesRepository(db);
    this.todosRepo = new TodosRepository(db);
    this.notesRepo = new OrganizedNotesRepository(db);
    this.todaySheetsRepo = new TodaySheetsRepository(db);
    this.weeklyReviewsRepo = new WeeklyReviewsRepository(db);
  }

  /**
   * Get the Monday and Sunday dates for a given date's week
   */
  private getWeekBounds(date: Date): { monday: string; sunday: string } {
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday is 0
    monday.setDate(date.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      monday: monday.toISOString().split('T')[0],
      sunday: sunday.toISOString().split('T')[0],
    };
  }

  /**
   * Generate a weekly review for the current or specified week
   */
  async generateReview(
    userId: string,
    weekStartDate?: string,
    forceRegenerate: boolean = false
  ): Promise<WeeklyReview> {
    // 1. Determine week bounds
    const targetDate = weekStartDate ? new Date(weekStartDate) : new Date();
    const { monday, sunday } = this.getWeekBounds(targetDate);

    // 2. Check if review already exists for this week
    const existingReview = await this.weeklyReviewsRepo.findByWeek(userId, monday);
    if (existingReview && !forceRegenerate) {
      return existingReview;
    }
    
    // If regenerating, delete the old review
    if (existingReview && forceRegenerate) {
      await this.weeklyReviewsRepo.delete(existingReview.id);
    }

    // 3. Gather data for the week
    const mondayDate = new Date(monday);
    const sundayDate = new Date(sunday);
    sundayDate.setHours(23, 59, 59, 999);

    // Get all todos and filter by completion date (for completed) or creation date (for pending)
    const allTodos = await this.todosRepo.findByUserId(userId);
    
    // Completed todos: those completed during this week (regardless of when created)
    const completedTodos = allTodos.filter(todo => {
      if (todo.status !== 'completed' || !todo.completedAt) return false;
      const completedAt = new Date(todo.completedAt);
      return completedAt >= mondayDate && completedAt <= sundayDate;
    });

    // Pending todos: those created during this week and still pending
    const pendingTodos = allTodos.filter(todo => {
      if (todo.status !== 'pending') return false;
      const createdAt = new Date(todo.createdAt);
      return createdAt >= mondayDate && createdAt <= sundayDate;
    });

    // Get captures from the week
    const allCaptures = await this.capturesRepo.findByUserId(userId);
    const weekCaptures = allCaptures.filter(capture => {
      const timestamp = new Date(capture.timestamp);
      return timestamp >= mondayDate && timestamp <= sundayDate;
    });

    // Get notes created or edited during the week
    const allNotes = await this.notesRepo.findByUserId(userId);
    const weekNotes = allNotes.filter(note => {
      const createdAt = new Date(note.createdAt);
      const updatedAt = new Date(note.updatedAt);
      return (createdAt >= mondayDate && createdAt <= sundayDate) ||
             (updatedAt >= mondayDate && updatedAt <= sundayDate);
    });

    // Get today sheets from the week (optional - for context)
    const allTodaySheets = await this.todaySheetsRepo.findByUserId(userId);
    const weekTodaySheets = allTodaySheets.filter(sheet => {
      const sheetDate = new Date(sheet.generatedAt);
      return sheetDate >= mondayDate && sheetDate <= sundayDate;
    });

    // 4. Call LLM to generate weekly review
    let aiResult: WeeklyReviewOutput;
    try {
      aiResult = await this.llmProvider.generateWeeklyReview({
        weekStartDate: monday,
        weekEndDate: sunday,
        completedTodos,
        pendingTodos,
        captures: weekCaptures,
        notes: weekNotes,
        todaySheets: weekTodaySheets,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation failed')) {
        throw new Error('AI returned invalid response format. Please try again.');
      }
      throw error;
    }

    // 5. Create weekly_reviews record
    const review = await this.weeklyReviewsRepo.create({
      userId,
      weekStartDate: monday,
      weekEndDate: sunday,
      summary: aiResult.summary,
      insights: aiResult.insights,
    });

    return review;
  }

  /**
   * Get the most recent weekly review
   */
  async getLatestReview(userId: string): Promise<WeeklyReview | undefined> {
    return this.weeklyReviewsRepo.findLatestByUserId(userId);
  }

  /**
   * Get all weekly reviews with pagination
   */
  async listReviews(
    userId: string,
    page: number = 1,
    perPage: number = 10
  ): Promise<WeeklyReview[]> {
    return this.weeklyReviewsRepo.findByUserId(userId, page, perPage);
  }

  /**
   * Get a specific weekly review by ID
   */
  async getReview(id: string, userId: string): Promise<WeeklyReview | undefined> {
    const review = await this.weeklyReviewsRepo.findById(id);
    if (review && review.userId !== userId) {
      throw new Error('Unauthorized');
    }
    return review;
  }
}
