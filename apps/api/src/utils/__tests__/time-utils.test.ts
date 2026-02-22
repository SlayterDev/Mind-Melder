import { describe, it, expect } from 'vitest';
import { timeToCron, cronToDescription, isValidTime } from '../time-utils.js';

describe('timeToCron', () => {
  describe('daily schedules', () => {
    it('should produce a daily cron for 08:00', () => {
      expect(timeToCron('08:00')).toBe('0 8 * * *');
    });

    it('should produce a daily cron for 17:30', () => {
      expect(timeToCron('17:30')).toBe('30 17 * * *');
    });

    it('should handle midnight (00:00)', () => {
      expect(timeToCron('00:00')).toBe('0 0 * * *');
    });

    it('should handle end of day (23:59)', () => {
      expect(timeToCron('23:59')).toBe('59 23 * * *');
    });

    it('should default to daily when frequency is not specified', () => {
      expect(timeToCron('09:15')).toBe('15 9 * * *');
    });

    it('should produce a daily cron when frequency is explicitly "daily"', () => {
      expect(timeToCron('10:00', 'daily')).toBe('0 10 * * *');
    });
  });

  describe('weekly schedules', () => {
    it('should produce a weekly cron on Monday (weekday=1)', () => {
      expect(timeToCron('09:00', 'weekly', '1')).toBe('0 9 * * 1');
    });

    it('should produce a weekly cron on Friday (weekday=5)', () => {
      expect(timeToCron('17:00', 'weekly', '5')).toBe('0 17 * * 5');
    });

    it('should produce a weekly cron on Sunday (weekday=0)', () => {
      expect(timeToCron('08:30', 'weekly', '0')).toBe('30 8 * * 0');
    });
  });
});

describe('cronToDescription', () => {
  describe('daily schedules', () => {
    it('should describe a morning AM schedule', () => {
      expect(cronToDescription('0 8 * * *')).toBe('Daily at 8:00 AM');
    });

    it('should describe an afternoon PM schedule', () => {
      expect(cronToDescription('0 14 * * *')).toBe('Daily at 2:00 PM');
    });

    it('should describe noon as 12:00 PM', () => {
      expect(cronToDescription('0 12 * * *')).toBe('Daily at 12:00 PM');
    });

    it('should describe midnight as 12:00 AM', () => {
      expect(cronToDescription('0 0 * * *')).toBe('Daily at 12:00 AM');
    });

    it('should zero-pad minutes correctly (e.g. 9:05)', () => {
      expect(cronToDescription('5 9 * * *')).toBe('Daily at 9:05 AM');
    });

    it('should describe 11:59 PM correctly', () => {
      expect(cronToDescription('59 23 * * *')).toBe('Daily at 11:59 PM');
    });
  });

  describe('weekly schedules', () => {
    it('should describe a weekly Monday schedule', () => {
      expect(cronToDescription('0 9 * * 1')).toBe('Weekly on Monday at 9:00 AM');
    });

    it('should describe a weekly Friday schedule', () => {
      expect(cronToDescription('0 17 * * 5')).toBe('Weekly on Friday at 5:00 PM');
    });

    it('should describe a weekly Sunday schedule', () => {
      expect(cronToDescription('30 10 * * 0')).toBe('Weekly on Sunday at 10:30 AM');
    });
  });

  describe('invalid input', () => {
    it('should return "Invalid schedule" when fewer than 5 parts', () => {
      expect(cronToDescription('0 8 * *')).toBe('Invalid schedule');
    });

    it('should return "Invalid schedule" for empty string', () => {
      expect(cronToDescription('')).toBe('Invalid schedule');
    });
  });
});

describe('isValidTime', () => {
  describe('valid times', () => {
    it('should accept 00:00', () => {
      expect(isValidTime('00:00')).toBe(true);
    });

    it('should accept 23:59', () => {
      expect(isValidTime('23:59')).toBe(true);
    });

    it('should accept 08:30', () => {
      expect(isValidTime('08:30')).toBe(true);
    });

    it('should accept 17:00', () => {
      expect(isValidTime('17:00')).toBe(true);
    });

    it('should accept 12:00', () => {
      expect(isValidTime('12:00')).toBe(true);
    });
  });

  describe('invalid times', () => {
    it('should reject 24:00 (hour out of range)', () => {
      expect(isValidTime('24:00')).toBe(false);
    });

    it('should reject 23:60 (minute out of range)', () => {
      expect(isValidTime('23:60')).toBe(false);
    });

    it('should reject single-digit hour without leading zero (9:00)', () => {
      expect(isValidTime('9:00')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidTime('')).toBe(false);
    });

    it('should reject non-time strings', () => {
      expect(isValidTime('morning')).toBe(false);
    });

    it('should reject times with seconds (HH:MM:SS)', () => {
      expect(isValidTime('08:00:00')).toBe(false);
    });
  });
});
