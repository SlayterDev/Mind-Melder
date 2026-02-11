import cron from 'node-cron';
import type { Database, SettingsRepository } from 'database';
import { ProviderFactory } from 'llm';
import { TodaySheetService } from './today-sheet-service.js';
import { OrganizationService } from './organization-service.js';
import { timeToCron, cronToDescription } from '../utils/time-utils.js';

interface ScheduledJob {
  task: cron.ScheduledTask;
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
    console.log('[Scheduler] Initializing scheduled jobs...');
    
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
      
      console.log(`[Scheduler] Initialization complete. Active jobs: ${this.jobs.size}`);
    } catch (error) {
      console.error('[Scheduler] Failed to initialize:', error);
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
    
    console.log(`[Scheduler] Scheduling: ${description}`);
    
    // Create the scheduled task
    const task = cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Executing today sheet generation...');
      try {
        const settings = await this.settingsRepo.getOrCreate(this.userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const todaySheetService = new TodaySheetService(this.db, llmProvider);
        
        const sheet = await todaySheetService.generateSheet(this.userId);
        console.log(`[Scheduler] Today sheet generated successfully. Processed ${sheet.capturesProcessed} captures.`);
      } catch (error) {
        console.error('[Scheduler] Today sheet generation failed:', error);
      }
    });
    
    this.jobs.set(jobKey, { task, description });
    console.log(`[Scheduler] Job scheduled: ${description}`);
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
    
    console.log(`[Scheduler] Scheduling: ${description}`);
    
    // Create the scheduled task
    const task = cron.schedule(cronExpression, async () => {
      console.log('[Scheduler] Executing organization flow...');
      try {
        const settings = await this.settingsRepo.getOrCreate(this.userId);
        const llmProvider = ProviderFactory.createFromSettings(settings);
        const organizationService = new OrganizationService(this.db, llmProvider);
        
        const result = await organizationService.organize(this.userId);
        console.log(`[Scheduler] Organization completed. Created ${result.notes.length} notes and ${result.todos.length} todos.`);
      } catch (error) {
        console.error('[Scheduler] Organization flow failed:', error);
      }
    });
    
    this.jobs.set(jobKey, { task, description });
    console.log(`[Scheduler] Job scheduled: ${description}`);
  }

  /**
   * Stop a specific scheduled job
   */
  stopJob(jobKey: string): void {
    const job = this.jobs.get(jobKey);
    if (job) {
      job.task.stop();
      this.jobs.delete(jobKey);
      console.log(`[Scheduler] Job stopped: ${job.description}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    console.log('[Scheduler] Stopping all jobs...');
    for (const [key, job] of this.jobs) {
      job.task.stop();
      console.log(`[Scheduler] Job stopped: ${job.description}`);
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
    console.log('[Scheduler] Reloading scheduled jobs...');
    this.stopAll();
    await this.initialize();
  }
}
