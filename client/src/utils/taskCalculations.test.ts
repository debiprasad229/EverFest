import { describe, it, expect } from 'vitest';
import { 
  calculateTaskMetrics, 
  isTaskOverdue, 
  isTaskDueToday,
  generateStarterChecklist,
  TaskFormSchema,
  parseDateOnly,
  formatDateToIsoString
} from './taskCalculations.js';
import { Task } from '../types/index.js';

describe('taskCalculations utility', () => {
  const REF_DATE = '2026-10-24'; // Fixed reference test date (Saturday)

  const createMockTask = (overrides: Partial<Task>): Task => ({
    id: `tsk-test-${Math.random()}`,
    eventId: 'evt-test-1',
    title: 'Test Task',
    category: 'Planning',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '2026-11-01',
    orderIndex: 1,
    isMilestone: false,
    createdAt: `${REF_DATE}T10:00:00.000Z`,
    updatedAt: `${REF_DATE}T10:00:00.000Z`,
    ...overrides,
  });

  // ==========================================
  // 1. PROGRESS PERCENTAGE & DERIVATION
  // ==========================================
  describe('Progress Percentage Calculations', () => {
    it('returns 0% progress when there are zero tasks (no divide by zero)', () => {
      const metrics = calculateTaskMetrics([], REF_DATE);
      expect(metrics.totalTasks).toBe(0);
      expect(metrics.completedTasks).toBe(0);
      expect(metrics.pendingTasks).toBe(0);
      expect(metrics.progressPercent).toBe(0);
      expect(metrics.overdueTasks).toBe(0);
      expect(metrics.upcomingTasks).toBe(0);
    });

    it('calculates exact 50% and 100% completion rates', () => {
      const tasks50: Task[] = [
        createMockTask({ status: 'COMPLETED' }),
        createMockTask({ status: 'TODO' }),
      ];
      const metrics50 = calculateTaskMetrics(tasks50, REF_DATE);
      expect(metrics50.progressPercent).toBe(50);
      expect(metrics50.completedTasks).toBe(1);
      expect(metrics50.pendingTasks).toBe(1);

      const tasks100: Task[] = [
        createMockTask({ status: 'COMPLETED' }),
        createMockTask({ status: 'COMPLETED' }),
      ];
      const metrics100 = calculateTaskMetrics(tasks100, REF_DATE);
      expect(metrics100.progressPercent).toBe(100);
      expect(metrics100.pendingTasks).toBe(0);
    });

    it('cleanly rounds progress percentages (1/3 = 33%, 2/3 = 67%)', () => {
      const tasks33: Task[] = [
        createMockTask({ status: 'COMPLETED' }),
        createMockTask({ status: 'TODO' }),
        createMockTask({ status: 'IN_PROGRESS' }),
      ];
      expect(calculateTaskMetrics(tasks33, REF_DATE).progressPercent).toBe(33);

      const tasks67: Task[] = [
        createMockTask({ status: 'COMPLETED' }),
        createMockTask({ status: 'COMPLETED' }),
        createMockTask({ status: 'TODO' }),
      ];
      expect(calculateTaskMetrics(tasks67, REF_DATE).progressPercent).toBe(67);
    });

    it('updates progress accurately when a task is completed and reopened', () => {
      const taskA = createMockTask({ status: 'TODO' });
      const taskB = createMockTask({ status: 'COMPLETED' });
      const list = [taskA, taskB];

      // Initial: 1/2 = 50%
      expect(calculateTaskMetrics(list, REF_DATE).progressPercent).toBe(50);

      // Complete Task A: 2/2 = 100%
      taskA.status = 'COMPLETED';
      expect(calculateTaskMetrics(list, REF_DATE).progressPercent).toBe(100);

      // Reopen Task B to TODO: 1/2 = 50%
      taskB.status = 'TODO';
      expect(calculateTaskMetrics(list, REF_DATE).progressPercent).toBe(50);
    });
  });

  // ==========================================
  // 2. OVERDUE & UPCOMING DATE/STATUS EDGE CASES
  // ==========================================
  describe('Date & Status Edge Cases', () => {
    it('flags past incomplete task as overdue', () => {
      const task = createMockTask({
        dueDate: '2026-10-20', // 4 days before REF_DATE
        status: 'TODO',
      });
      expect(isTaskOverdue(task, REF_DATE)).toBe(true);

      const metrics = calculateTaskMetrics([task], REF_DATE);
      expect(metrics.overdueTasks).toBe(1);
      expect(metrics.upcomingTasks).toBe(0);
      expect(metrics.overdueList[0].id).toBe(task.id);
    });

    it('CRITICAL: completed task with past due date is NEVER overdue', () => {
      const task = createMockTask({
        dueDate: '2026-10-15', // 9 days in the past
        status: 'COMPLETED',
      });
      expect(isTaskOverdue(task, REF_DATE)).toBe(false);

      const metrics = calculateTaskMetrics([task], REF_DATE);
      expect(metrics.overdueTasks).toBe(0);
      expect(metrics.completedTasks).toBe(1);
      expect(metrics.completedList.length).toBe(1);
    });

    it('task due TODAY is NOT overdue, it is upcoming/due today', () => {
      const task = createMockTask({
        dueDate: REF_DATE, // exactly today
        status: 'TODO',
      });
      expect(isTaskOverdue(task, REF_DATE)).toBe(false);
      expect(isTaskDueToday(task, REF_DATE)).toBe(true);

      const metrics = calculateTaskMetrics([task], REF_DATE);
      expect(metrics.overdueTasks).toBe(0);
      expect(metrics.upcomingTasks).toBe(1);
    });

    it('task due tomorrow or in the future is upcoming', () => {
      const task = createMockTask({
        dueDate: '2026-10-25', // 1 day ahead
        status: 'TODO',
      });
      expect(isTaskOverdue(task, REF_DATE)).toBe(false);

      const metrics = calculateTaskMetrics([task], REF_DATE);
      expect(metrics.overdueTasks).toBe(0);
      expect(metrics.upcomingTasks).toBe(1);
    });

    it('reopening an overdue task restores it to the overdue list', () => {
      const task = createMockTask({
        dueDate: '2026-10-20', // past
        status: 'COMPLETED',
      });

      // While completed, not overdue
      expect(calculateTaskMetrics([task], REF_DATE).overdueTasks).toBe(0);

      // Reopen to TODO: now it is recognized as overdue
      task.status = 'TODO';
      const reopenedMetrics = calculateTaskMetrics([task], REF_DATE);
      expect(reopenedMetrics.overdueTasks).toBe(1);
      expect(reopenedMetrics.overdueList.length).toBe(1);
      expect(reopenedMetrics.completedTasks).toBe(0);
    });
  });

  // ==========================================
  // 3. STARTER CHECKLIST GENERATOR & TIGHT TIMELINES
  // ==========================================
  describe('Starter Checklist Generator & Tight Timelines', () => {
    it('generates a full structured checklist for far future event (e.g. 120 days out)', () => {
      const eventDate = '2027-02-21'; // ~120 days from REF_DATE
      const checklist = generateStarterChecklist('WEDDING', eventDate, 'evt-wedding', REF_DATE);

      expect(checklist.length).toBeGreaterThanOrEqual(6);
      expect(checklist[0].eventId).toBe('evt-wedding');
      expect(checklist[0].status).toBe('TODO');

      // Check dates: all must be >= REF_DATE and <= eventDate
      for (const task of checklist) {
        expect(task.dueDate).toBeDefined();
        const dueTime = parseDateOnly(task.dueDate!).getTime();
        expect(dueTime).toBeGreaterThanOrEqual(parseDateOnly(REF_DATE).getTime());
        expect(dueTime).toBeLessThanOrEqual(parseDateOnly(eventDate).getTime());
      }
    });

    it('HANDLES TIGHT TIMELINE: event in 5 days distributes tasks without past dates', () => {
      const eventDate = '2026-10-29'; // 5 days from REF_DATE
      const checklist = generateStarterChecklist('BIRTHDAY', eventDate, 'evt-bday-5d', REF_DATE);

      expect(checklist.length).toBeGreaterThanOrEqual(5);

      for (const task of checklist) {
        expect(task.dueDate).toBeDefined();
        const dueTime = parseDateOnly(task.dueDate!).getTime();
        // NEVER before today
        expect(dueTime).toBeGreaterThanOrEqual(parseDateOnly(REF_DATE).getTime());
        // NEVER after event date
        expect(dueTime).toBeLessThanOrEqual(parseDateOnly(eventDate).getTime());
      }
    });

    it('HANDLES EXTREME TIGHT TIMELINE: event tomorrow (1 day away)', () => {
      const eventDate = '2026-10-25'; // Tomorrow
      const checklist = generateStarterChecklist('ANNIVERSARY', eventDate, 'evt-tomorrow', REF_DATE);

      expect(checklist.length).toBeGreaterThan(0);

      for (const task of checklist) {
        // Due date must be either today (2026-10-24) or tomorrow (2026-10-25)
        expect([REF_DATE, eventDate]).toContain(task.dueDate);
        // Priority should be elevated to URGENT or HIGH
        expect(['HIGH', 'URGENT']).toContain(task.priority);
      }
    });

    it('HANDLES SAME DAY EVENT: event today (0 days away)', () => {
      const eventDate = REF_DATE; // Same day
      const checklist = generateStarterChecklist('COMMUNITY', eventDate, 'evt-today', REF_DATE);

      expect(checklist.length).toBeGreaterThan(0);

      for (const task of checklist) {
        // All tasks due today
        expect(task.dueDate).toBe(REF_DATE);
        // Priorities elevated
        expect(['MEDIUM', 'HIGH', 'URGENT']).toContain(task.priority);
      }
    });

    it('generates unique category-specific tasks for different event types', () => {
      const weddingTasks = generateStarterChecklist('WEDDING', '2026-12-01', 'w1', REF_DATE);
      const communityTasks = generateStarterChecklist('COMMUNITY', '2026-12-01', 'c1', REF_DATE);

      const weddingTitles = weddingTasks.map(t => t.title.toLowerCase());
      const communityTitles = communityTasks.map(t => t.title.toLowerCase());

      expect(weddingTitles.some(t => t.includes('ceremony') || t.includes('tasting'))).toBe(true);
      expect(communityTitles.some(t => t.includes('permit') || t.includes('volunteer'))).toBe(true);
    });
  });

  // ==========================================
  // 4. ZOD FORM VALIDATION
  // ==========================================
  describe('Task Form Schema Validation', () => {
    it('validates valid task form with assignee and notes', () => {
      const result = TaskFormSchema.safeParse({
        title: 'Review contract with floral designer',
        dueDate: '2026-11-15',
        priority: 'HIGH',
        status: 'TODO',
        assignee: 'Sophie Bennett',
        notes: 'Ask about centerpiece transport crates',
        category: 'Decor',
        isMilestone: true,
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty task title or missing due date', () => {
      const emptyTitle = TaskFormSchema.safeParse({
        title: '   ',
        dueDate: '2026-11-15',
      });
      expect(emptyTitle.success).toBe(false);

      const missingDate = TaskFormSchema.safeParse({
        title: 'Valid Title',
        dueDate: '',
      });
      expect(missingDate.success).toBe(false);
    });
  });
});
