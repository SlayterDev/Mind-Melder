# Desktop Notifications Feature - Visual Guide

This document provides visual descriptions of the Desktop Notifications feature for Mind Melder.

## 1. Settings Page - Notification Configuration

**Location:** Settings > Desktop Notifications section

**Visual Description:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Desktop Notifications                                            │
│  Get notified about upcoming and overdue todos right on your      │
│  desktop.                                                          │
│                                                                    │
│  ☑ Enable desktop notifications                                  │
│                                                                    │
│  │  Check for due todos every:                                   │
│  │  [10 minutes ▼]                                               │
│  │                                                                │
│  │  Remind me before due date:                                   │
│  │  [1 hour ▼]                                                   │
│  │                                                                │
│  │  ☑ Show notifications for overdue tasks                       │
│  │  ☑ Show notifications for upcoming tasks                      │
│  │                                                                │
│  │  Quiet hours (optional):                                      │
│  │  Start: [  :  ]  to  End: [  :  ]                           │
│  │  No notifications will be sent during quiet hours            │
│                                                                    │
│  [Save Settings]  [Test Notifications]                           │
└──────────────────────────────────────────────────────────────────┘
```

**Features Visible:**
- Master toggle for enabling/disabling notifications
- Check interval dropdown (5, 10, 15, 30, 60 minutes)
- Reminder timing dropdown (15min, 30min, 1hr, 2hr, 4hr, 1 day)
- Checkboxes for overdue and upcoming notification types
- Time pickers for quiet hours (optional)
- Save and Test buttons

## 2. Desktop Notification - Upcoming Task

**Platform:** macOS Notification Center / Windows Action Center / Linux Notification Daemon

**Visual Description:**
```
┌──────────────────────────────────────────────┐
│  ⏰ Task Due Soon                             │
│                                               │
│  Review PR #123 is due in 1 hour            │
│                                               │
│  [Mind Melder icon]              [View] [✕]  │
└──────────────────────────────────────────────┘
```

**Behavior:**
- Appears as native OS notification
- "View" button or click navigates to app and focuses todo
- Dismiss button closes notification
- Uses normal urgency level
- Sound plays (unless system is muted)

## 3. Desktop Notification - Overdue Task

**Platform:** macOS Notification Center / Windows Action Center / Linux Notification Daemon

**Visual Description:**
```
┌──────────────────────────────────────────────┐
│  ⚠️ Overdue Task                              │
│                                               │
│  Submit quarterly report (overdue by 2 days)  │
│                                               │
│  [Mind Melder icon]              [View] [✕]  │
└──────────────────────────────────────────────┘
```

**Behavior:**
- Appears as native OS notification
- Uses critical urgency (may bypass Do Not Disturb on some systems)
- Red/warning styling (OS-dependent)
- Persistent in notification center
- Sound plays with urgency

## 4. Settings Page - Desktop App Not Detected

**Location:** Settings > Desktop Notifications section (when accessed via web browser)

**Visual Description:**
```
┌──────────────────────────────────────────────────────────────────┐
│  ℹ️  Desktop App Required                                         │
│                                                                    │
│  Notifications are only available in the desktop app. Download    │
│  it from the releases page to receive desktop notifications for   │
│  your todos.                                                       │
└──────────────────────────────────────────────────────────────────┘
```

**Purpose:**
- Informs web users that notifications require the desktop app
- Friendly, informative message
- Blue info icon with clear explanation

## 5. Notification Console Logs (Development)

**Location:** Electron DevTools Console

**Example Output:**
```
[Notifications] Service starting with settings: {
  enabled: true,
  checkInterval: 10,
  reminderMinutes: 60,
  showOverdue: true,
  showUpcoming: true,
  quietHoursStart: null,
  quietHoursEnd: null
}
[Notifications] Scheduled checks every 10 minutes
[Notifications] Checking for due todos...
[Notifications] Found 3 todos with due dates
[Notifications] Shown: ⏰ Task Due Soon - Review PR #123 (due in 1 hour)
[Notifications] Sent 1 notification(s)
[Notifications] Notification clicked for todo: abc-123-def
```

**Purpose:**
- Debug logging for development
- Shows service lifecycle
- Tracks notification delivery
- Useful for troubleshooting

## 6. Notification Flow Diagram

```
┌─────────────┐
│ User opens  │
│ desktop app │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Notification        │
│ service starts      │
│ (after 3s delay)    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Fetch settings      │
│ from API            │
└──────┬──────────────┘
       │
       ▼
    ┌──────────┐
    │ Enabled? │──No──► [Service idle]
    └──┬───────┘
       │ Yes
       ▼
┌─────────────────────┐
│ Schedule periodic   │
│ checks (N minutes)  │
└──────┬──────────────┘
       │
       ▼
   ┌─────────────────┐
   │ Check interval  │◄────┐
   │ timer fires     │     │
   └──┬──────────────┘     │
      │                    │
      ▼                    │
   ┌──────────────┐        │
   │ Quiet hours? │─Yes──► │
   └──┬───────────┘        │
      │ No                 │
      ▼                    │
   ┌──────────────┐        │
   │ Fetch todos  │        │
   │ with due     │        │
   │ dates        │        │
   └──┬───────────┘        │
      │                    │
      ▼                    │
   ┌──────────────────┐    │
   │ For each todo:   │    │
   │ - Check overdue  │    │
   │ - Check upcoming │    │
   │ - Send notif     │    │
   └──┬───────────────┘    │
      │                    │
      │ Wait for next      │
      │ interval           │
      └────────────────────┘
```

## 7. User Interaction Scenarios

### Scenario 1: Morning Startup
1. User opens Mind Melder desktop app at 8:00 AM
2. Service starts after 3 seconds
3. Loads settings (notifications enabled, check every 10 min, remind 1 hour before)
4. Checks todos immediately
5. Finds 2 todos: one due at 9:00 AM, one due at 2:00 PM
6. Shows notification: "Task Due Soon - Morning standup (due in 1 hour)"
7. User clicks notification → app focuses and shows todos page

### Scenario 2: Quiet Hours
1. User sets quiet hours: 10:00 PM - 8:00 AM
2. At 11:00 PM, check interval fires
3. Service detects quiet hours
4. Skips notification check
5. No notifications sent during night
6. At 8:01 AM, next check happens normally

### Scenario 3: Todo Completion
1. Notification shown for "Submit report (due in 1 hour)"
2. User completes the todo in the app
3. App calls `clearNotificationState(todoId)`
4. Todo ID removed from notified set
5. If due date is changed and still upcoming, can notify again

### Scenario 4: Settings Change
1. User changes check interval from 10 to 30 minutes
2. User clicks "Save Settings"
3. App calls `restartNotificationService()`
4. Service stops old timer
5. Fetches new settings
6. Starts new timer with 30-minute interval

## 8. Platform-Specific Appearance

### macOS
- Notifications appear in top-right corner
- Slide in with animation
- Persist in Notification Center
- Respect "Do Not Disturb" (except critical)
- Badge with app icon

### Windows
- Notifications appear in bottom-right corner
- Toast-style notification
- Persist in Action Center
- Respect "Focus Assist" settings
- App icon displayed

### Linux
- Varies by desktop environment
- Generally top-right or top-center
- Uses libnotify protocol
- Styling depends on notification daemon
- App icon if configured

## 9. Settings Persistence

**Database Schema:**
```sql
ALTER TABLE settings 
  ADD COLUMN notifications_enabled BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN notifications_check_interval INTEGER DEFAULT 10 NOT NULL,
  ADD COLUMN notifications_reminder_minutes INTEGER DEFAULT 60 NOT NULL,
  ADD COLUMN notifications_show_overdue BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN notifications_show_upcoming BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN notifications_quiet_hours_start TEXT,
  ADD COLUMN notifications_quiet_hours_end TEXT;
```

**Default Values:**
- Enabled: true
- Check interval: 10 minutes
- Reminder window: 60 minutes (1 hour)
- Show overdue: true
- Show upcoming: true
- Quiet hours: null (disabled)

## 10. Error Handling

### API Unavailable
```
[Notifications] Failed to fetch settings, using defaults
[Service continues with default settings]
```

### No Todos Due
```
[Notifications] Found 0 todos with due dates
[Notifications] No notifications needed
```

### Notification Permission Denied
- Service attempts to send notification
- OS blocks due to permissions
- Electron logs error
- User sees system permission prompt (first time)

---

**Note:** Actual appearance may vary based on OS version, theme, and user preferences. The visual descriptions above represent typical layouts and behaviors.
