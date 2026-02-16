# Desktop Notifications Feature

## Overview

The Desktop Notifications feature provides timely, non-intrusive reminders for todos that are due soon or overdue. This feature leverages Electron's native notification API to deliver system-level notifications that appear even when the app is minimized or in the background.

## Purpose

Users capture and organize tasks throughout the day, but often lose track of time-sensitive items. Desktop notifications help users:

- Stay aware of upcoming deadlines without manually checking the todo list
- Get gentle reminders for overdue items they might have forgotten
- Maintain focus on current work while staying informed of time-sensitive tasks

## Architecture

### Components

1. **Notification Service (Electron Main Process)**
   - Manages notification scheduling and delivery
   - Queries database for todos with due dates
   - Sends system notifications via Electron Notification API
   - Runs periodic checks for due/overdue todos

2. **Settings Storage (Database)**
   - User notification preferences stored in `settings` table
   - Default settings applied for new users
   - Settings include: enabled/disabled, check interval, reminder timing

3. **IPC Communication**
   - Main process ↔ Renderer process communication
   - Handles notification clicks (opens todo list, focuses specific todo)
   - Allows renderer to trigger immediate notification checks

4. **Settings UI (Frontend)**
   - Toggle notifications on/off
   - Configure when to be notified (e.g., 1 hour before due)
   - Set check interval (how often to scan for due todos)

### Notification Types

1. **Upcoming Due** - Triggered when a todo is approaching its due date
   - Example: "Task 'Review PR #123' is due in 1 hour"
   - Shows when: current time >= (due_date - reminder_minutes)

2. **Overdue** - Triggered when a todo's due date has passed
   - Example: "Task 'Submit report' is overdue"
   - Shows when: current time > due_date and status = 'pending'

3. **Today's Todos** - Morning summary of todos due today (optional)
   - Example: "You have 5 tasks due today"
   - Shows when: configured time (e.g., 9:00 AM)

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main Process                                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Notification Service                           │    │
│  │                                                 │    │
│  │  • Periodic timer (every N minutes)            │    │
│  │  • Query todos with due dates                  │    │
│  │  • Check user notification settings            │    │
│  │  • Calculate which todos need notifications    │    │
│  │  • Send Electron notifications                 │    │
│  │  • Track already-notified todos                │    │
│  └────────────────────────────────────────────────┘    │
│                          ↓                               │
│  ┌────────────────────────────────────────────────┐    │
│  │ Electron Notification API                      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Operating System                                       │
│                                                          │
│  Native notification appears                            │
│  • macOS: Notification Center                          │
│  • Windows: Action Center                              │
│  • Linux: Desktop notification system                  │
└─────────────────────────────────────────────────────────┘
```

### Settings Schema

Notification preferences are stored in the `settings` table with key-value pairs:

```typescript
// Settings keys and their default values
{
  "notifications.enabled": true,              // Master toggle
  "notifications.checkInterval": 5,           // Minutes between checks
  "notifications.reminderMinutes": 60,        // Notify X minutes before due
  "notifications.showOverdue": true,          // Show overdue notifications
  "notifications.showUpcoming": true,         // Show upcoming notifications
  "notifications.dailySummary": false,        // Show morning summary
  "notifications.dailySummaryTime": "09:00",  // Time for daily summary
  "notifications.quietHoursStart": null,      // Start of quiet hours (e.g., "22:00")
  "notifications.quietHoursEnd": null         // End of quiet hours (e.g., "08:00")
}
```

### Notification State Management

To avoid duplicate notifications, the service maintains in-memory state:

```typescript
interface NotificationState {
  notifiedTodos: Set<string>;  // Todo IDs that have been notified
  lastCheck: Date;              // Last time we checked for due todos
  dailySummaryShown: string;    // Date string of last daily summary (YYYY-MM-DD)
}
```

State is cleared when:
- App restarts (notifications re-trigger after restart)
- A todo is marked as completed
- A todo's due date is modified

## API Integration

### Existing API Endpoints

The notification service uses existing API endpoints:

```typescript
// Fetch todos with due dates
GET /api/v1/todos?status=pending

// Get notification settings
GET /api/v1/settings/notifications.enabled
GET /api/v1/settings/notifications.checkInterval
// ... etc

// Set notification settings
POST /api/v1/settings
{
  "key": "notifications.enabled",
  "value": true
}
```

### New IPC Handlers

Electron IPC handlers for notification management:

```typescript
// Check for notifications immediately (manual trigger)
ipcMain.handle('check-notifications')

// Clear notification state for a specific todo (when completed/modified)
ipcMain.handle('clear-notification-state', (event, todoId: string))

// Handle notification click (open app to todo)
// Built-in: Notification.on('click', ...)
```

## User Interface

### Settings Page Integration

Add a new "Notifications" section to the Settings page (`apps/web/src/pages/SettingsPage.tsx`):

```tsx
<div className="space-y-4">
  <h3 className="text-lg font-medium">Notifications</h3>
  
  <label className="flex items-center gap-2">
    <input type="checkbox" checked={enabled} onChange={...} />
    Enable desktop notifications
  </label>
  
  <div className="ml-6 space-y-3">
    <label>
      Check for due todos every:
      <select value={checkInterval} onChange={...}>
        <option value="5">5 minutes</option>
        <option value="10">10 minutes</option>
        <option value="15">15 minutes</option>
        <option value="30">30 minutes</option>
      </select>
    </label>
    
    <label>
      Remind me before due date:
      <select value={reminderMinutes} onChange={...}>
        <option value="15">15 minutes</option>
        <option value="30">30 minutes</option>
        <option value="60">1 hour</option>
        <option value="120">2 hours</option>
        <option value="1440">1 day</option>
      </select>
    </label>
    
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={showOverdue} onChange={...} />
      Show notifications for overdue tasks
    </label>
    
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={showUpcoming} onChange={...} />
      Show notifications for upcoming tasks
    </label>
  </div>
</div>
```

### Notification Appearance

**Upcoming Todo Notification:**
```
Title: "Task Due Soon"
Body: "Review PR #123 is due in 1 hour"
Icon: App icon
Actions: ["View", "Dismiss"]
```

**Overdue Todo Notification:**
```
Title: "Overdue Task"
Body: "Submit quarterly report is overdue"
Icon: App icon (with urgency indicator)
Actions: ["View", "Dismiss"]
```

**Daily Summary Notification:**
```
Title: "Today's Tasks"
Body: "You have 5 tasks due today"
Icon: App icon
Actions: ["View"]
```

## Implementation Details

### Notification Service (Main Process)

File: `apps/web/electron/notification-service.ts`

```typescript
import { Notification } from 'electron';
import fetch from 'node-fetch';

interface NotificationSettings {
  enabled: boolean;
  checkInterval: number;
  reminderMinutes: number;
  showOverdue: boolean;
  showUpcoming: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

class NotificationService {
  private notifiedTodos = new Set<string>();
  private lastCheck: Date = new Date(0);
  private timer: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }

  async start() {
    const settings = await this.getSettings();
    if (!settings.enabled) return;

    // Initial check
    await this.checkAndNotify();

    // Set up periodic checks
    this.timer = setInterval(
      () => this.checkAndNotify(),
      settings.checkInterval * 60 * 1000
    );
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async getSettings(): Promise<NotificationSettings> {
    // Fetch settings from API
    const response = await fetch(`${this.apiBaseUrl}/settings`);
    const allSettings = await response.json();
    
    // Extract and parse notification settings with defaults
    return {
      enabled: allSettings.find(s => s.key === 'notifications.enabled')?.value ?? true,
      checkInterval: allSettings.find(s => s.key === 'notifications.checkInterval')?.value ?? 10,
      reminderMinutes: allSettings.find(s => s.key === 'notifications.reminderMinutes')?.value ?? 60,
      showOverdue: allSettings.find(s => s.key === 'notifications.showOverdue')?.value ?? true,
      showUpcoming: allSettings.find(s => s.key === 'notifications.showUpcoming')?.value ?? true,
      quietHoursStart: allSettings.find(s => s.key === 'notifications.quietHoursStart')?.value ?? null,
      quietHoursEnd: allSettings.find(s => s.key === 'notifications.quietHoursEnd')?.value ?? null,
    };
  }

  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Simple time comparison (doesn't handle overnight ranges yet)
    return currentTime >= settings.quietHoursStart && currentTime <= settings.quietHoursEnd;
  }

  private async checkAndNotify() {
    const settings = await this.getSettings();
    if (!settings.enabled || this.isQuietHours(settings)) return;

    // Fetch pending todos with due dates
    const response = await fetch(`${this.apiBaseUrl}/todos?status=pending`);
    const todos = await response.json();

    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + settings.reminderMinutes * 60 * 1000);

    for (const todo of todos) {
      if (!todo.dueDate) continue;
      
      const dueDate = new Date(todo.dueDate);
      const todoId = todo.id;

      // Skip if already notified
      if (this.notifiedTodos.has(todoId)) continue;

      // Check for overdue
      if (settings.showOverdue && dueDate < now) {
        this.sendNotification('Overdue Task', `${todo.content} is overdue`, todoId);
        this.notifiedTodos.add(todoId);
        continue;
      }

      // Check for upcoming
      if (settings.showUpcoming && dueDate <= reminderThreshold && dueDate > now) {
        const minutesUntil = Math.floor((dueDate.getTime() - now.getTime()) / 60000);
        const timeStr = minutesUntil < 60 
          ? `${minutesUntil} minutes` 
          : `${Math.floor(minutesUntil / 60)} hour${Math.floor(minutesUntil / 60) > 1 ? 's' : ''}`;
        
        this.sendNotification(
          'Task Due Soon',
          `${todo.content} is due in ${timeStr}`,
          todoId
        );
        this.notifiedTodos.add(todoId);
      }
    }

    this.lastCheck = now;
  }

  private sendNotification(title: string, body: string, todoId: string) {
    const notification = new Notification({
      title,
      body,
      silent: false,
    });

    notification.on('click', () => {
      // TODO: Focus main window and navigate to todo
      console.log('Notification clicked:', todoId);
    });

    notification.show();
  }

  clearNotificationState(todoId: string) {
    this.notifiedTodos.delete(todoId);
  }

  clearAllState() {
    this.notifiedTodos.clear();
  }
}
```

### Integration with Main Process

Update `apps/web/electron/main.ts` to initialize and manage the notification service.

### Frontend Settings Component

Create `apps/web/src/components/NotificationSettings.tsx` with a form for managing notification preferences.

## Security & Privacy

1. **Permission**: Electron notifications use system permissions. Users must grant notification permission at the OS level.
2. **No PII in Notifications**: Only task titles are shown, no sensitive metadata.
3. **Local Only**: No notification data sent to external services.
4. **User Control**: Easy toggle to disable all notifications.

## Performance Considerations

1. **Efficient Polling**: Default 10-minute check interval balances responsiveness and resource usage.
2. **In-Memory State**: Notification tracking uses minimal memory (Set of IDs).
3. **Lazy Loading**: Notification service only runs when enabled.
4. **Background Operation**: Runs in Electron main process, doesn't block renderer.

## Testing

### Manual Testing

1. **Test Upcoming Notifications**:
   - Create a todo with due date 1 hour from now
   - Wait for notification (or trigger manual check)
   - Verify notification appears with correct timing

2. **Test Overdue Notifications**:
   - Create a todo with due date in the past
   - Trigger notification check
   - Verify overdue notification appears

3. **Test Settings**:
   - Toggle notifications off → verify no notifications
   - Change check interval → verify new timing
   - Change reminder window → verify notifications adjust

4. **Test Quiet Hours**:
   - Set quiet hours for current time
   - Verify no notifications during quiet hours

5. **Test Notification Click**:
   - Click notification
   - Verify app focuses and navigates to todo list

### Edge Cases

- App not running → No notifications (expected, not a background service)
- No due dates set → No notifications (expected)
- Completed todos → Should not notify (verify cleared from state)
- Modified due dates → Should re-notify if changed to upcoming
- System notifications disabled → Fail gracefully, show warning in settings

## Platform-Specific Behavior

### macOS
- Notifications appear in Notification Center
- Persist in notification history
- Respect system Do Not Disturb mode

### Windows
- Notifications appear in Action Center
- Toast notifications
- Respect Focus Assist settings

### Linux
- Uses desktop notification daemon (libnotify)
- Varies by desktop environment
- Generally supports standard notification protocol

## Future Enhancements

Potential improvements for future releases:

1. **Smart Scheduling**: Learn user's work patterns and optimize notification timing
2. **Notification Grouping**: Batch multiple due todos into single notification
3. **Snooze Function**: Allow users to snooze notifications for X minutes
4. **Background Service**: Run as system service for notifications even when app is closed
5. **Priority-Based Notifications**: More urgent notifications for high-priority todos
6. **Custom Notification Sounds**: Allow users to choose notification sound
7. **Notification History**: View past notifications in the app
8. **Rich Notifications**: Include action buttons (Complete, Snooze, View)

## Migration

No database migrations required. Uses existing `settings` table for storing preferences.

Default settings are created on first notification settings access via the API.

## Related Documentation

- [Electron Desktop](./ELECTRON_DESKTOP.md) - Desktop app architecture
- [Project Spec](./PROJECT_SPEC.md) - Overall feature specifications
- [Tech Stack](./TECH_STACK.md) - Technology choices and architecture

## Implementation Checklist

- [ ] Create notification service module (`apps/web/electron/notification-service.ts`)
- [ ] Add IPC handlers in `apps/web/electron/main.ts`
- [ ] Create notification settings component (`apps/web/src/components/NotificationSettings.tsx`)
- [ ] Integrate settings component into Settings page
- [ ] Add default notification settings to settings API
- [ ] Test notification timing and delivery
- [ ] Test settings persistence and updates
- [ ] Test notification click handling
- [ ] Test quiet hours functionality
- [ ] Document platform-specific testing results
