import { Notification, BrowserWindow } from 'electron';

interface NotificationSettings {
  enabled: boolean;
  checkInterval: number;
  reminderMinutes: number;
  showOverdue: boolean;
  showUpcoming: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface Todo {
  id: string;
  content: string;
  dueDate: string | null;
  status: string;
}

export class NotificationService {
  private notifiedTodos = new Set<string>();
  private lastCheck: Date = new Date(0);
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

      // Set up periodic checks
      this.timer = setInterval(
        () => this.checkAndNotify(),
        settings.checkInterval * 60 * 1000
      );
      
      console.log(`[Notifications] Scheduled checks every ${settings.checkInterval} minutes`);
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
      const response = await fetch(`${this.apiBaseUrl}/settings`);
      if (!response.ok) {
        console.warn('[Notifications] Failed to fetch settings, using defaults');
        return this.getDefaultSettings();
      }

      const settings = await response.json();
      
      // Extract notification settings from the settings object
      return {
        enabled: settings.notificationsEnabled ?? true,
        checkInterval: settings.notificationsCheckInterval ?? 10,
        reminderMinutes: settings.notificationsReminderMinutes ?? 60,
        showOverdue: settings.notificationsShowOverdue ?? true,
        showUpcoming: settings.notificationsShowUpcoming ?? true,
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
      checkInterval: 10,
      reminderMinutes: 60,
      showOverdue: true,
      showUpcoming: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    };
  }

  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quietHoursStart;
    const end = settings.quietHoursEnd;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    }
    
    // Normal quiet hours (e.g., 13:00 to 14:00)
    return currentTime >= start && currentTime <= end;
  }

  async checkAndNotify() {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) {
        return;
      }

      if (this.isQuietHours(settings)) {
        console.log('[Notifications] In quiet hours, skipping notification check');
        return;
      }

      console.log('[Notifications] Checking for due todos...');

      // Fetch pending todos with due dates
      const response = await fetch(`${this.apiBaseUrl}/todos?status=pending`);
      if (!response.ok) {
        console.error('[Notifications] Failed to fetch todos:', response.statusText);
        return;
      }

      const todos: Todo[] = await response.json();
      const todosWithDates = todos.filter(t => t.dueDate);

      console.log(`[Notifications] Found ${todosWithDates.length} todos with due dates`);

      const now = new Date();
      const reminderThreshold = new Date(now.getTime() + settings.reminderMinutes * 60 * 1000);

      let notificationsSent = 0;

      for (const todo of todosWithDates) {
        if (!todo.dueDate) continue;
        
        const dueDate = new Date(todo.dueDate);
        const todoId = todo.id;

        // Skip if already notified
        if (this.notifiedTodos.has(todoId)) continue;

        // Check for overdue
        if (settings.showOverdue && dueDate < now) {
          const hoursOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (60 * 60 * 1000));
          const timeStr = hoursOverdue < 24 
            ? `${hoursOverdue} hour${hoursOverdue !== 1 ? 's' : ''}` 
            : `${Math.floor(hoursOverdue / 24)} day${Math.floor(hoursOverdue / 24) !== 1 ? 's' : ''}`;
          
          this.sendNotification(
            '⚠️ Overdue Task',
            `${todo.content} (overdue by ${timeStr})`,
            todoId,
            true
          );
          this.notifiedTodos.add(todoId);
          notificationsSent++;
          continue;
        }

        // Check for upcoming
        if (settings.showUpcoming && dueDate <= reminderThreshold && dueDate > now) {
          const minutesUntil = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
          let timeStr: string;
          
          if (minutesUntil < 60) {
            timeStr = `${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
          } else if (minutesUntil < 1440) {
            const hours = Math.floor(minutesUntil / 60);
            timeStr = `${hours} hour${hours !== 1 ? 's' : ''}`;
          } else {
            const days = Math.floor(minutesUntil / 1440);
            timeStr = `${days} day${days !== 1 ? 's' : ''}`;
          }
          
          this.sendNotification(
            '⏰ Task Due Soon',
            `${todo.content} (due in ${timeStr})`,
            todoId,
            false
          );
          this.notifiedTodos.add(todoId);
          notificationsSent++;
        }
      }

      if (notificationsSent > 0) {
        console.log(`[Notifications] Sent ${notificationsSent} notification(s)`);
      } else {
        console.log('[Notifications] No notifications needed');
      }

      this.lastCheck = now;
    } catch (error) {
      console.error('[Notifications] Error during notification check:', error);
    }
  }

  private sendNotification(title: string, body: string, todoId: string, isOverdue: boolean = false) {
    try {
      const notification = new Notification({
        title,
        body,
        silent: false,
        urgency: isOverdue ? 'critical' : 'normal',
      });

      notification.on('click', () => {
        console.log('[Notifications] Notification clicked for todo:', todoId);
        
        // Focus main window if it exists
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
          this.mainWindow.focus();
          
          // Send IPC event to navigate to todos page
          this.mainWindow.webContents.send('navigate-to-todo', todoId);
        }
      });

      notification.show();
      console.log(`[Notifications] Shown: ${title} - ${body}`);
    } catch (error) {
      console.error('[Notifications] Failed to show notification:', error);
    }
  }

  clearNotificationState(todoId: string) {
    const removed = this.notifiedTodos.delete(todoId);
    if (removed) {
      console.log(`[Notifications] Cleared notification state for todo: ${todoId}`);
    }
  }

  clearAllState() {
    const count = this.notifiedTodos.size;
    this.notifiedTodos.clear();
    if (count > 0) {
      console.log(`[Notifications] Cleared notification state for ${count} todo(s)`);
    }
  }

  // Get current state for debugging
  getState() {
    return {
      notifiedTodos: Array.from(this.notifiedTodos),
      lastCheck: this.lastCheck,
      isRunning: this.timer !== null,
    };
  }
}
