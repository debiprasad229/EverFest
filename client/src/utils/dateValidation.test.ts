import { describe, it, expect } from 'vitest';
import { 
  parseDateOnly, 
  formatDateToIsoString, 
  getDaysDifference, 
  isTaskOverdue, 
  isTaskDueToday 
} from './taskCalculations.js';
import { planEventSchema } from '../components/events/PlanEventModal.js';
import { TaskFormSchema } from './taskCalculations.js';
import { BudgetItemFormSchema } from './budgetCalculations.js';
import { Task } from '../types/index.js';

describe('Date Calculations & Boundary Edge Cases', () => {
  // ==========================================
  // 1. LEAP YEAR HANDLING
  // ==========================================
  describe('Leap Year Scenarios', () => {
    it('correctly parses and preserves February 29 in leap years (2024, 2028)', () => {
      const leapDate2024 = parseDateOnly('2024-02-29');
      expect(leapDate2024.getFullYear()).toBe(2024);
      expect(leapDate2024.getMonth()).toBe(1); // 0-indexed: 1 = February
      expect(leapDate2024.getDate()).toBe(29);
      expect(formatDateToIsoString(leapDate2024)).toBe('2024-02-29');

      const leapDate2028 = parseDateOnly('2028-02-29');
      expect(leapDate2028.getFullYear()).toBe(2028);
      expect(leapDate2028.getMonth()).toBe(1);
      expect(leapDate2028.getDate()).toBe(29);
      expect(formatDateToIsoString(leapDate2028)).toBe('2028-02-29');
    });

    it('calculates exact 1-day difference across February 28 and February 29 in a leap year', () => {
      const diffLeap = getDaysDifference('2028-02-29', '2028-02-28');
      expect(diffLeap).toBe(1);

      const diffToMarch = getDaysDifference('2028-03-01', '2028-02-29');
      expect(diffToMarch).toBe(1);

      // In non-leap year (2026), 2026-02-28 to 2026-03-01 is 1 day
      const diffNonLeap = getDaysDifference('2026-03-01', '2026-02-28');
      expect(diffNonLeap).toBe(1);
    });

    it('correctly handles leap day as task deadline', () => {
      const task: Task = {
        id: 'tsk-leap-1',
        eventId: 'evt-1',
        title: 'Book Leap Day Venue',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: '2028-02-29',
        orderIndex: 1,
        isMilestone: true,
        createdAt: '2028-01-01T00:00:00Z',
        updatedAt: '2028-01-01T00:00:00Z',
      };

      // Reference date: 2028-02-28 (1 day before leap day) -> upcoming, not overdue
      expect(isTaskOverdue(task, '2028-02-28')).toBe(false);
      expect(isTaskDueToday(task, '2028-02-28')).toBe(false);

      // Reference date: exactly leap day 2028-02-29 -> due today, not overdue
      expect(isTaskOverdue(task, '2028-02-29')).toBe(false);
      expect(isTaskDueToday(task, '2028-02-29')).toBe(true);

      // Reference date: 2028-03-01 -> 1 day overdue
      expect(isTaskOverdue(task, '2028-03-01')).toBe(true);
      expect(isTaskDueToday(task, '2028-03-01')).toBe(false);
    });
  });

  // ==========================================
  // 2. YEAR & MONTH TRANSITIONS
  // ==========================================
  describe('Year & Month Boundary Transitions', () => {
    it('accurately calculates day differences across New Year boundary (Dec 31 to Jan 1)', () => {
      const diff = getDaysDifference('2027-01-01', '2026-12-31');
      expect(diff).toBe(1);

      const diffWeek = getDaysDifference('2027-01-07', '2026-12-31');
      expect(diffWeek).toBe(7);
    });

    it('accurately calculates day difference across 30-day month boundaries', () => {
      // April has 30 days: April 30 to May 1 is 1 day
      expect(getDaysDifference('2026-05-01', '2026-04-30')).toBe(1);
      // September has 30 days: Sept 30 to Oct 1 is 1 day
      expect(getDaysDifference('2026-10-01', '2026-09-30')).toBe(1);
    });

    it('handles far-future dates (e.g. 5 years in advance)', () => {
      const diffYears = getDaysDifference('2031-10-24', '2026-10-24');
      // 5 years includes 1 leap year (2028): 365*4 + 366 = 1826 days
      expect(diffYears).toBe(1826);
    });
  });

  // ==========================================
  // 3. SAME-DAY & PAST DATE BOUNDARIES
  // ==========================================
  describe('Same-Day & Past Date Scenarios', () => {
    it('returns 0 difference for identical dates', () => {
      expect(getDaysDifference('2026-10-24', '2026-10-24')).toBe(0);
    });

    it('returns negative difference when target date is in the past', () => {
      expect(getDaysDifference('2026-10-20', '2026-10-24')).toBe(-4);
      expect(getDaysDifference('2025-10-24', '2026-10-24')).toBe(-365);
    });

    it('parses ISO date-time strings with trailing time/zone parts cleanly', () => {
      const parsedWithTime = parseDateOnly('2026-10-24T18:30:00.000Z');
      expect(parsedWithTime.getFullYear()).toBe(2026);
      expect(parsedWithTime.getMonth()).toBe(9); // October
      expect(parsedWithTime.getDate()).toBe(24);
      expect(formatDateToIsoString(parsedWithTime)).toBe('2026-10-24');
    });
  });
});

// ==========================================
// 4. FORM VALIDATION SCHEMAS & BOUNDARY LIMITS
// ==========================================
describe('Form Validation Schemas & Boundary Limits', () => {
  describe('planEventSchema (Event Create/Edit)', () => {
    it('validates a complete, valid event form submission', () => {
      const result = planEventSchema.safeParse({
        title: 'Aurelia & Julian Autumn Nuptials',
        eventType: 'WEDDING',
        date: '2026-10-31',
        startTime: '15:00',
        endTime: '23:00',
        locationName: 'Rosewood Villa',
        locationAddress: '100 Botanical Way, Portland, OR',
        estimatedGuests: 120,
        totalBudget: 35000,
        currency: 'USD',
        themeAesthetic: 'Botanical Romance',
        specialPreferences: 'String trio for ceremony',
        notes: 'Private bridal suite booked',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estimatedGuests).toBe(120);
        expect(result.data.totalBudget).toBe(35000);
        expect(result.data.eventType).toBe('WEDDING');
      }
    });

    it('rejects title shorter than 2 characters', () => {
      const result = planEventSchema.safeParse({
        title: 'A',
        eventType: 'WEDDING',
        date: '2026-10-31',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.errors.find(e => e.path.includes('title'));
        expect(titleError).toBeDefined();
        expect(titleError?.message).toContain('at least 2 characters');
      }
    });

    it('rejects empty date string', () => {
      const result = planEventSchema.safeParse({
        title: 'Birthday Bash',
        eventType: 'BIRTHDAY',
        date: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const dateError = result.error.errors.find(e => e.path.includes('date'));
        expect(dateError).toBeDefined();
      }
    });

    it('rejects 0 guests and negative guests', () => {
      const zeroGuests = planEventSchema.safeParse({
        title: 'Birthday Bash',
        eventType: 'BIRTHDAY',
        date: '2026-11-15',
        estimatedGuests: 0,
      });
      expect(zeroGuests.success).toBe(false);

      const negativeGuests = planEventSchema.safeParse({
        title: 'Birthday Bash',
        eventType: 'BIRTHDAY',
        date: '2026-11-15',
        estimatedGuests: -10,
      });
      expect(negativeGuests.success).toBe(false);
    });

    it('rejects negative total budget', () => {
      const result = planEventSchema.safeParse({
        title: 'Community Fundraiser',
        eventType: 'COMMUNITY',
        date: '2026-12-01',
        totalBudget: -500,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const budgetError = result.error.errors.find(e => e.path.includes('totalBudget'));
        expect(budgetError).toBeDefined();
        expect(budgetError?.message).toContain('Budget must be positive');
      }
    });

    it('coerces string guest count and budget inputs into numbers', () => {
      const result = planEventSchema.safeParse({
        title: 'Anniversary Dinner',
        eventType: 'ANNIVERSARY',
        date: '2026-11-20',
        estimatedGuests: '45' as unknown as number,
        totalBudget: '7500' as unknown as number,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.estimatedGuests).toBe(45);
        expect(result.data.totalBudget).toBe(7500);
      }
    });
  });

  describe('TaskFormSchema & BudgetItemFormSchema', () => {
    it('validates task priority enum restrictions', () => {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
      for (const p of validPriorities) {
        const res = TaskFormSchema.safeParse({
          title: `Task with ${p}`,
          dueDate: '2026-11-01',
          priority: p,
        });
        expect(res.success).toBe(true);
      }

      const invalidPriority = TaskFormSchema.safeParse({
        title: 'Invalid Task',
        dueDate: '2026-11-01',
        priority: 'SUPER_URGENT',
      });
      expect(invalidPriority.success).toBe(false);
    });

    it('validates budget payment status enum values', () => {
      const validStatuses = ['UNPAID', 'DEPOSIT_PAID', 'PAID_IN_FULL'] as const;
      for (const s of validStatuses) {
        const res = BudgetItemFormSchema.safeParse({
          name: 'Item',
          estimatedCost: 100,
          paymentStatus: s,
        });
        expect(res.success).toBe(true);
      }

      const invalidStatus = BudgetItemFormSchema.safeParse({
        name: 'Item',
        estimatedCost: 100,
        paymentStatus: 'REFUNDED',
      });
      expect(invalidStatus.success).toBe(false);
    });
  });
});
