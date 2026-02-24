import cron, { ScheduledTask } from 'node-cron';
import type { Database, SettingsRepository } from 'database';
import { ProviderFactory } from 'llm';
import { TodaySheetService } from './today-sheet-service.js';
import { OrganizationService } from './organization-service.js';
import { timeToCron, cronToDescription } from '../utils/time-utils.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Scheduler');

interface ScheduledJob {
  task: ScheduledTask;
  description: string;
}

/**
 * Service for managing scheduled jobs (today sheet generation and organization)
 */
export class SchedulerService {
  private jobs: Map<string, ScheduledJob> = new Map();
  private userId: string = 'test-user-1'; // TODO: Support multiple users

  constructor(
    private db: Database,
    private settingsRepo: SettingsRepository
  ) {}

  /**
   * Initialize all scheduled jobs based on current settings
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scheduled jobs');

    try {
      const settings = await this.settingsRepo.getOrCreate(this.userId);

      // Schedule today sheet generation
      if (settings.todaySheetScheduleEnabled && settings.todaySheetTime) {
        this.scheduleTodaySheet(settings.todaySheetTime);
      }

      // Schedule organization flow
      if (settings.organizeScheduleEnabled && settings.organizeScheduleTime) {
        this.scheduleOrganize(
          settings.organizeScheduleTime,
          settings.organizeScheduleFrequency,
          settings.organizeScheduleWeekday
        );
      }

      logger.info('Scheduler initialization complete', { activeJobCount: this.jobs.size });
    } catch (error) {
      logger.errorWithException('Failed to initialize scheduler', error);
    }
  }

  /**
   * Schedule today sheet generation
   */
  scheduleTodaySheet(time: string): void {
    const jobKey = 'today-sheet';

    // Stop existing job if any
    this.stopJob(jobKey);

    // Convert time to CRON
    const cronExpression = timeToCron(time, 'daily');
    const description = `Today Sheet generation: ${cronToDescription(cronExpression)}`;

    logger.info('Scheduling job', { jobKey, description, cronExpression });

    // Create the scheduled task
    const task = cron.schedule(cronExpression, async () => {
      logger.info('Executing scheduled today sheet generation', { jobKey });
      try {
        const settings = await this.settingsRepo.getOrCreate(this.userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const todaySheetService = new TodaySheetService(this.db, llmProvider);

        const sheet = await todaySheetService.generateSheet(this.userId, undefined, settings.contentLockEnabled);
        logger.info('Scheduled today sheet generation succeeded', {
          jobKey,
          capturesProcessed: sheet.capturesProcessed,
          todosIncluded: sheet.todosIncluded,
        });
      } catch (error) {
        logger.errorWithException('Scheduled today sheet generation failed', error, { jobKey });
      }
    });

    this.jobs.set(jobKey, { task, description });
    logger.info('Job scheduled', { jobKey, description });
  }

  /**
   * Schedule organization flow
   */
  scheduleOrganize(time: string, frequency: 'daily' | 'weekly', weekday: string): void {
    const jobKey = 'organize';

    // Stop existing job if any
    this.stopJob(jobKey);

    // Convert time to CRON
    const cronExpression = timeToCron(time, frequency, weekday);
    const description = `Organization flow: ${cronToDescription(cronExpression)}`;

    logger.info('Scheduling job', { jobKey, description, cronExpression });

    // Create the scheduled task
    const task = cron.schedule(cronExpression, async () => {
      logger.info('Executing scheduled organization flow', { jobKey });
      try {
        const settings = await this.settingsRepo.getOrCreate(this.userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const organizationService = new OrganizationService(this.db, llmProvider);

        const result = await organizationService.organizeCaptures(this.userId);
        logger.info('Scheduled organization flow succeeded', {
          jobKey,
          capturesProcessed: result.capturesProcessed,
          todosCreated: result.todosCount,
        });
      } catch (error) {
        logger.errorWithException('Scheduled organization flow failed', error, { jobKey });
      }
    });

    this.jobs.set(jobKey, { task, description });
    logger.info('Job scheduled', { jobKey, description });
  }

  /**
   * Stop a specific scheduled job
   */
  stopJob(jobKey: string): void {
    const job = this.jobs.get(jobKey);
    if (job) {
      job.task.stop();
      this.jobs.delete(jobKey);
      logger.info('Job stopped', { jobKey, description: job.description });
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    logger.info('Stopping all scheduled jobs', { jobCount: this.jobs.size });
    for (const [key, job] of this.jobs) {
      job.task.stop();
      logger.debug('Job stopped', { jobKey: key, description: job.description });
    }
    this.jobs.clear();
  }

  /**
   * Get list of active jobs
   */
  getActiveJobs(): Array<{ key: string; description: string }> {
    return Array.from(this.jobs.entries()).map(([key, job]) => ({
      key,
      description: job.description,
    }));
  }

  /**
   * Reload all jobs from current settings
   */
  async reload(): Promise<void> {
    logger.info('Reloading scheduled jobs');
    this.stopAll();
    await this.initialize();
  }
}
