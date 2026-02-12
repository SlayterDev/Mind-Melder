/**
 * Utility functions for time formatting and conversion
 */

// Time format regex (HH:MM in 24-hour format) - matches validation.ts
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Convert time in HH:MM format to CRON format
 * @param time - Time in HH:MM format (e.g., "08:00", "17:30")
 * @param frequency - "daily" for daily execution, "weekly" for weekly
 * @param weekday - Day of week for weekly schedules (0-6, Sunday-Saturday)
 * @returns CRON expression (e.g., "0 8 * * *" for daily at 8:00 AM)
 */
export function timeToCron(
  time: string,
  frequency: 'daily' | 'weekly' = 'daily',
  weekday: string = '1'
): string {
  // Parse HH:MM
  const [hours, minutes] = time.split(':').map(Number);

  if (frequency === 'weekly') {
    // Weekly: minute hour * * weekday
    return `${minutes} ${hours} * * ${weekday}`;
  }

  // Daily: minute hour * * *
  return `${minutes} ${hours} * * *`;
}

/**
 * Convert CRON expression to human-readable description
 * @param cron - CRON expression (e.g., "0 8 * * *")
 * @returns Human-readable description (e.g., "Daily at 8:00 AM")
 */
export function cronToDescription(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length < 5) return 'Invalid schedule';

  const [minute, hour, , , weekday] = parts;
  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);

  // Format time as 12-hour with AM/PM
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  const timeStr = `${hour12}:${minuteNum.toString().padStart(2, '0')} ${period}`;

  // Check if it's weekly (specific weekday)
  if (weekday !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `Weekly on ${days[parseInt(weekday, 10)]} at ${timeStr}`;
  }

  return `Daily at ${timeStr}`;
}

/**
 * Validate time string in HH:MM format
 * @param time - Time string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTime(time: string): boolean {
  return TIME_FORMAT_REGEX.test(time);
}
