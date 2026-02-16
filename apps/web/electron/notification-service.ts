import { Notification, BrowserWindow } from 'electron';

interface NotificationSettings {
  enabled: boolean;
  morningReminderEnabled: boolean;
  morningReminderTime: string; // HH:MM format
  afternoonReminderEnabled: boolean;
  afternoonReminderTime: string; // HH:MM format
  showOverdue: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface Todo {
  id: string;
  content: string;
  dueDate: string | null;
  status: string;
}

interface Settings {
  notificationsEnabled?: boolean;
  notificationsMorningReminderEnabled?: boolean;
  notificationsMorningReminderTime?: string;
  notificationsAfternoonReminderEnabled?: boolean;
  notificationsAfternoonReminderTime?: string;
  notificationsShowOverdue?: boolean;
  notificationsQuietHoursStart?: string | null;
  notificationsQuietHoursEnd?: string | null;
}

export class NotificationService {
  private lastMorningCheck: string | null = null; // Date string YYYY-MM-DD
  private lastAfternoonCheck: string | null = null; // Date string YYYY-MM-DD
  private timer: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;
  private mainWindow: BrowserWindow | null;

  constructor(apiBaseUrl: string, mainWindow: BrowserWindow | null = null) {
    this.apiBaseUrl = apiBaseUrl;
    this.mainWindow = mainWindow;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  // Simple API helper for main process (no browser dependencies)
  private async fetchAPI<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async start() {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) {
        console.log('[Notifications] Disabled in settings, not starting service');
        return;
      }

      console.log('[Notifications] Service starting with settings:', settings);

      // Initial check after a short delay to let app initialize
      setTimeout(() => this.checkAndNotify(), 5000);

      // Check every minute for scheduled reminders
      this.timer = setInterval(
        () => this.checkAndNotify(),
        60 * 1000 // Check every minute
      );
      
      console.log('[Notifications] Scheduled checks every minute for daily reminders');
    } catch (error) {
      console.error('[Notifications] Failed to start service:', error);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[Notifications] Service stopped');
    }
  }

  async restart() {
    console.log('[Notifications] Restarting service');
    this.stop();
    await this.start();
  }

  private async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await this.fetchAPI<Settings>('/settings');
      
      // Extract notification settings from the settings object
      return {
        enabled: settings.notificationsEnabled ?? true,
        morningReminderEnabled: settings.notificationsMorningReminderEnabled ?? true,
        morningReminderTime: settings.notificationsMorningReminderTime ?? '09:00',
        afternoonReminderEnabled: settings.notificationsAfternoonReminderEnabled ?? false,
        afternoonReminderTime: settings.notificationsAfternoonReminderTime ?? '15:00',
        showOverdue: settings.notificationsShowOverdue ?? true,
        quietHoursStart: settings.notificationsQuietHoursStart ?? null,
        quietHoursEnd: settings.notificationsQuietHoursEnd ?? null,
      };
    } catch (error) {
      console.error('[Notifications] Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      morningReminderEnabled: true,
      morningReminderTime: '09:00',
      afternoonReminderEnabled: false,
      afternoonReminderTime: '15:00',
      showOverdue: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    };
  }

  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;
    
    const now = new Date();
    // Use 24-hour format (HH:MM) - always use getHours() which returns 0-23
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeMinutes = currentHours * 60 + currentMinutes;
    
    // Parse start and end times (expected format: "HH:MM" in 24-hour format)
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      // Handle invalid input gracefully
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return -1;
      }
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTime(settings.quietHoursStart);
    const endMinutes = parseTime(settings.quietHoursEnd);
    
    // If parsing failed, disable quiet hours
    if (startMinutes === -1 || endMinutes === -1) {
      return false;
    }
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
    }
    
    // Normal quiet hours (e.g., 13:00 to 14:00)
    return currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
  }

  async checkAndNotify() {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) {
        return;
      }

      if (this.isQuietHours(settings)) {
        return; // Skip during quiet hours
      }

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if it's time for morning reminder
      if (settings.morningReminderEnabled && 
          this.lastMorningCheck !== currentDate &&
          this.isReminderTime(currentTime, settings.morningReminderTime)) {
        await this.sendDailyReminder('morning', settings, currentDate);
        this.lastMorningCheck = currentDate;
      }

      // Check if it's time for afternoon reminder (for tomorrow's items)
      if (settings.afternoonReminderEnabled &&
          this.lastAfternoonCheck !== currentDate &&
          this.isReminderTime(currentTime, settings.afternoonReminderTime)) {
        await this.sendDailyReminder('afternoon', settings, currentDate);
        this.lastAfternoonCheck = currentDate;
      }
    } catch (error) {
      console.error('[Notifications] Error during notification check:', error);
    }
  }

  // Check if current time matches reminder time (within 1 minute)
  private isReminderTime(currentTime: string, reminderTime: string): boolean {
    const [currentH, currentM] = currentTime.split(':').map(Number);
    const [reminderH, reminderM] = reminderTime.split(':').map(Number);
    
    // Check if we're within 1 minute of the reminder time
    return currentH === reminderH && Math.abs(currentM - reminderM) <= 1;
  }

  // Get date part only from ISO string (YYYY-MM-DD)
  private getDateOnly(isoString: string): string {
    return isoString.split('T')[0];
  }

  private async sendDailyReminder(type: 'morning' | 'afternoon', settings: NotificationSettings, currentDate: string) {
    try {
      // Fetch pending todos with due dates
      const todos = await this.fetchAPI<Todo[]>('/todos?status=pending');
      const todosWithDates = todos.filter(t => t.dueDate);

      const today = currentDate;
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      let todayTodos: Todo[] = [];
      let tomorrowTodos: Todo[] = [];
      let overdueTodos: Todo[] = [];

      // Categorize todos by date
      for (const todo of todosWithDates) {
        if (!todo.dueDate) continue;
        const dueDate = this.getDateOnly(todo.dueDate);
        
        if (dueDate < today) {
          overdueTodos.push(todo);
        } else if (dueDate === today) {
          todayTodos.push(todo);
        } else if (dueDate === tomorrowStr) {
          tomorrowTodos.push(todo);
        }
      }

      if (type === 'morning') {
        this.sendMorningReminder(todayTodos, overdueTodos, settings);
      } else {
        this.sendAfternoonReminder(tomorrowTodos);
      }
    } catch (error) {
      console.error(`[Notifications] Error sending ${type} reminder:`, error);
    }
  }

  private sendMorningReminder(todayTodos: Todo[], overdueTodos: Todo[], settings: NotificationSettings) {
    const totalToday = todayTodos.length;
    const totalOverdue = settings.showOverdue ? overdueTodos.length : 0;
    
    if (totalToday === 0 && totalOverdue === 0) {
      console.log('[Notifications] No todos for today, skipping morning reminder');
      return;
    }

    let title = '☀️ Good Morning';
    let body = '';

    if (totalToday > 0 && totalOverdue > 0) {
      body = `You have ${totalToday} task${totalToday !== 1 ? 's' : ''} due today and ${totalOverdue} overdue task${totalOverdue !== 1 ? 's' : ''}.`;
    } else if (totalToday > 0) {
      body = `You have ${totalToday} task${totalToday !== 1 ? 's' : ''} due today.`;
    } else if (totalOverdue > 0) {
      body = `You have ${totalOverdue} overdue task${totalOverdue !== 1 ? 's' : ''}.`;
    }

    // Add preview of first few tasks
    const previewTodos = [...todayTodos, ...overdueTodos].slice(0, 3);
    if (previewTodos.length > 0) {
      body += '\n\n';
      body += previewTodos.map(t => `• ${t.content}`).join('\n');
      if (totalToday + totalOverdue > 3) {
        body += `\n... and ${totalToday + totalOverdue - 3} more`;
      }
    }

    this.sendSummaryNotification(title, body);
    console.log(`[Notifications] Sent morning reminder: ${totalToday} today, ${totalOverdue} overdue`);
  }

  private sendAfternoonReminder(tomorrowTodos: Todo[]) {
    const totalTomorrow = tomorrowTodos.length;
    
    if (totalTomorrow === 0) {
      console.log('[Notifications] No todos for tomorrow, skipping afternoon reminder');
      return;
    }

    const title = '📅 Tomorrow\'s Tasks';
    let body = `You have ${totalTomorrow} task${totalTomorrow !== 1 ? 's' : ''} due tomorrow.`;

    // Add preview of first few tasks
    const previewTodos = tomorrowTodos.slice(0, 3);
    if (previewTodos.length > 0) {
      body += '\n\n';
      body += previewTodos.map(t => `• ${t.content}`).join('\n');
      if (totalTomorrow > 3) {
        body += `\n... and ${totalTomorrow - 3} more`;
      }
    }

    this.sendSummaryNotification(title, body);
    console.log(`[Notifications] Sent afternoon reminder: ${totalTomorrow} tomorrow`);
  }

  private sendSummaryNotification(title: string, body: string) {
    try {
      const notification = new Notification({
        title,
        body,
        silent: false,
        urgency: 'normal',
      });

      notification.on('click', () => {
        console.log('[Notifications] Summary notification clicked');
        
        // Focus main window and navigate to todos
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
          this.mainWindow.focus();
          
          // Navigate to todos page
          this.mainWindow.webContents.send('navigate-to-todos');
        }
      });

      notification.show();
      console.log(`[Notifications] Shown: ${title}`);
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
    }
  }

  clearAllState() {
    this.lastMorningCheck = null;
    this.lastAfternoonCheck = null;
    console.log('[Notifications] Cleared notification state');
  }

  // Get current state for debugging
  getState() {
    return {
      lastMorningCheck: this.lastMorningCheck,
      lastAfternoonCheck: this.lastAfternoonCheck,
      isRunning: this.timer !== null,
    };
  }
}
