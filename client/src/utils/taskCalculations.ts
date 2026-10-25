import { z } from 'zod';
import { Task, TaskPriority, TaskStatus, EventType } from '../types/index.js';

// ==========================================
// ZOD VALIDATION SCHEMA FOR TASKS
// ==========================================

export const TaskFormSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).default('TODO'),
  assignee: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  category: z.string().trim().optional(),
  isMilestone: z.boolean().default(false),
});

export type TaskFormData = z.infer<typeof TaskFormSchema>;

// ==========================================
// TASK METRICS INTERFACE
// ==========================================

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  upcomingTasks: number;
  progressPercent: number; // 0 to 100
  overdueList: Task[];
  upcomingList: Task[];
  completedList: Task[];
}

// ==========================================
// DATE COMPARISON HELPERS
// ==========================================

/**
 * Normalizes date to midnight UTC/Local for clean calendar day comparisons
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function formatDateToIsoString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysDifference(targetDateStr: string, refDateStr?: string): number {
  const target = parseDateOnly(targetDateStr);
  const ref = refDateStr ? parseDateOnly(refDateStr) : new Date();
  ref.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the task is overdue.
 * Completed tasks are NEVER overdue.
 * Tasks due today are NOT overdue.
 */
export function isTaskOverdue(task: Task, refDateStr?: string): boolean {
  if (task.status === 'COMPLETED') return false;
  if (!task.dueDate) return false;
  const diff = getDaysDifference(task.dueDate, refDateStr);
  return diff < 0;
}

export function isTaskDueToday(task: Task, refDateStr?: string): boolean {
  if (!task.dueDate) return false;
  const diff = getDaysDifference(task.dueDate, refDateStr);
  return diff === 0;
}

// ==========================================
// TASK PROGRESS & DERIVATION
// ==========================================

export function calculateTaskMetrics(tasks: Task[], refDateStr?: string): TaskMetrics {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const pendingTasks = totalTasks - completedTasks;

  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const overdueList: Task[] = [];
  const upcomingList: Task[] = [];
  const completedList: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'COMPLETED') {
      completedList.push(task);
    } else if (task.dueDate && isTaskOverdue(task, refDateStr)) {
      overdueList.push(task);
    } else {
      upcomingList.push(task);
    }
  }

  // Sort overdue: oldest due date first (most urgent)
  overdueList.sort((a, b) => {
    const da = a.dueDate ? parseDateOnly(a.dueDate).getTime() : 0;
    const db = b.dueDate ? parseDateOnly(b.dueDate).getTime() : 0;
    return da - db;
  });

  // Sort upcoming: closest due date first
  upcomingList.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return parseDateOnly(a.dueDate).getTime() - parseDateOnly(b.dueDate).getTime();
  });

  return {
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks: overdueList.length,
    upcomingTasks: upcomingList.length,
    progressPercent,
    overdueList,
    upcomingList,
    completedList,
  };
}

// ==========================================
// STARTER CHECKLIST GENERATOR
// ==========================================

export interface StarterTaskBlueprint {
  title: string;
  category: string;
  priority: TaskPriority;
  notes: string;
  assignee?: string;
  isMilestone: boolean;
  relativePlacement: number; // 0.0 = earliest planning, 1.0 = day of event
  standardDaysBefore: number; // ideal days prior for long timelines
}

const TEMPLATES: Record<string, StarterTaskBlueprint[]> = {
  WEDDING: [
    {
      title: 'Secure Ceremony Altar & Reception Venue',
      category: 'Venue',
      priority: 'URGENT',
      notes: 'Confirm contract hours, noise ordinance curfew, and staging access',
      isMilestone: true,
      relativePlacement: 0.1,
      standardDaysBefore: 120,
    },
    {
      title: 'Book Catering & Schedule Menu Tasting',
      category: 'Catering',
      priority: 'HIGH',
      notes: 'Confirm dietary options (vegetarian, vegan, gluten-free) and bar packages',
      isMilestone: false,
      relativePlacement: 0.25,
      standardDaysBefore: 90,
    },
    {
      title: 'Hire Lead Photographer & Videographer',
      category: 'Photography',
      priority: 'HIGH',
      notes: 'Review portfolio shot list and lock in drone or second-shooter coverage',
      isMilestone: false,
      relativePlacement: 0.35,
      standardDaysBefore: 75,
    },
    {
      title: 'Send Formal Invitations & Launch RSVP Link',
      category: 'Invitations',
      priority: 'HIGH',
      notes: 'Track headcounts, plus-ones, and accessibility requirements',
      isMilestone: true,
      relativePlacement: 0.5,
      standardDaysBefore: 45,
    },
    {
      title: 'Finalize Floral Arch, Table Linens & Decor',
      category: 'Decor',
      priority: 'MEDIUM',
      notes: 'Review mockup color palette and candle safety clearances',
      isMilestone: false,
      relativePlacement: 0.75,
      standardDaysBefore: 20,
    },
    {
      title: 'Confirm Reception DJ/Band Playlists & Audio Lapels',
      category: 'Entertainment',
      priority: 'MEDIUM',
      notes: 'Share first dance, processional, and "do not play" list',
      isMilestone: false,
      relativePlacement: 0.85,
      standardDaysBefore: 10,
    },
    {
      title: 'Distribute Minute-by-Minute Run-of-Show to Vendors',
      category: 'Coordination',
      priority: 'HIGH',
      notes: 'Brief MC, photographer, coordinator, and banquet captain',
      isMilestone: true,
      relativePlacement: 0.95,
      standardDaysBefore: 3,
    },
  ],
  BIRTHDAY: [
    {
      title: 'Reserve Birthday Venue or Private Lounge',
      category: 'Venue',
      priority: 'HIGH',
      notes: 'Confirm booking deposit, table setup, and outside cake policy',
      isMilestone: true,
      relativePlacement: 0.15,
      standardDaysBefore: 40,
    },
    {
      title: 'Order Specialty Birthday Cake & Canapes',
      category: 'Catering',
      priority: 'HIGH',
      notes: 'Choose custom sponge flavor, allergen warnings, and custom inscription',
      isMilestone: false,
      relativePlacement: 0.35,
      standardDaysBefore: 25,
    },
    {
      title: 'Send Birthday Invites & Track Guest Confirmations',
      category: 'Invitations',
      priority: 'MEDIUM',
      notes: 'Distribute digital RSVP link and collect dietary notes',
      isMilestone: true,
      relativePlacement: 0.5,
      standardDaysBefore: 18,
    },
    {
      title: 'Arrange Party Entertainment, DJ & Fun Activities',
      category: 'Entertainment',
      priority: 'MEDIUM',
      notes: 'Book DJ, magician, trivia host, or curated party playlist',
      isMilestone: false,
      relativePlacement: 0.7,
      standardDaysBefore: 10,
    },
    {
      title: 'Purchase Balloons, Tableware & Celebration Favors',
      category: 'Decor',
      priority: 'LOW',
      notes: 'Themed napkins, photo booth props, and candles',
      isMilestone: false,
      relativePlacement: 0.85,
      standardDaysBefore: 4,
    },
    {
      title: 'Final Headcount & Day-of Schedule Check-in',
      category: 'Coordination',
      priority: 'HIGH',
      notes: 'Confirm arrival time with venue host and guest surprises',
      isMilestone: true,
      relativePlacement: 0.95,
      standardDaysBefore: 1,
    },
  ],
  ANNIVERSARY: [
    {
      title: 'Reserve Celebration Hall or Fine Dining Room',
      category: 'Venue',
      priority: 'HIGH',
      notes: 'Confirm private dining room availability and acoustic ambiance',
      isMilestone: true,
      relativePlacement: 0.15,
      standardDaysBefore: 45,
    },
    {
      title: 'Curate 3-Course Dinner & Reserve Champagne Toast',
      category: 'Catering',
      priority: 'HIGH',
      notes: 'Select wine pairings, signature cocktails, and celebratory dessert',
      isMilestone: false,
      relativePlacement: 0.35,
      standardDaysBefore: 30,
    },
    {
      title: 'Book Acoustic Duo or Harpist for Reception',
      category: 'Entertainment',
      priority: 'MEDIUM',
      notes: 'Request special meaningful songs and prelude classics',
      isMilestone: false,
      relativePlacement: 0.5,
      standardDaysBefore: 20,
    },
    {
      title: 'Send Elegant Invitations to Friends & Family',
      category: 'Invitations',
      priority: 'MEDIUM',
      notes: 'Include dress code guidance and RSVP deadline',
      isMilestone: true,
      relativePlacement: 0.65,
      standardDaysBefore: 15,
    },
    {
      title: 'Prepare Memory Slide or Keepsake Memory Table',
      category: 'Decor',
      priority: 'LOW',
      notes: 'Gather archive photos, guest book, and floral arrangements',
      isMilestone: false,
      relativePlacement: 0.85,
      standardDaysBefore: 5,
    },
    {
      title: 'Confirm Transportation & Rehearsal Briefing',
      category: 'Coordination',
      priority: 'HIGH',
      notes: 'Lock in guest shuttle timing and toast speeches order',
      isMilestone: true,
      relativePlacement: 0.95,
      standardDaysBefore: 2,
    },
  ],
  COMMUNITY: [
    {
      title: 'Secure Municipal Pavilion Permit & Event Liability Insurance',
      category: 'Venue',
      priority: 'URGENT',
      notes: 'Submit sound amplification permit and safety clearances',
      isMilestone: true,
      relativePlacement: 0.1,
      standardDaysBefore: 60,
    },
    {
      title: 'Organize Volunteer Committee & Security Leads',
      category: 'Coordination',
      priority: 'HIGH',
      notes: 'Assign registration desk, first aid station, and parking team leads',
      isMilestone: false,
      relativePlacement: 0.3,
      standardDaysBefore: 40,
    },
    {
      title: 'Contract Local Food Trucks & Beverage Vendors',
      category: 'Catering',
      priority: 'HIGH',
      notes: 'Verify health inspection certificates and waste disposal plans',
      isMilestone: false,
      relativePlacement: 0.45,
      standardDaysBefore: 30,
    },
    {
      title: 'Launch Community Promotion & Registration Link',
      category: 'Invitations',
      priority: 'MEDIUM',
      notes: 'Print posters, publish social announcements, and open free RSVP portal',
      isMilestone: true,
      relativePlacement: 0.6,
      standardDaysBefore: 20,
    },
    {
      title: 'Rent Staging, PA Sound System & Shaded Canopies',
      category: 'Decor',
      priority: 'HIGH',
      notes: 'Confirm delivery window, generator power, and accessibility ramps',
      isMilestone: false,
      relativePlacement: 0.8,
      standardDaysBefore: 7,
    },
    {
      title: 'Final Site Walkthrough & Volunteer Briefing',
      category: 'Coordination',
      priority: 'URGENT',
      notes: 'Inspect directional signage, trash stations, and stage schedule',
      isMilestone: true,
      relativePlacement: 0.95,
      standardDaysBefore: 2,
    },
  ],
  OTHER: [
    {
      title: 'Define Event Objectives, Budget & Venue Requirements',
      category: 'Planning',
      priority: 'HIGH',
      notes: 'Lock in expected headcount capacity and functional zones',
      isMilestone: true,
      relativePlacement: 0.15,
      standardDaysBefore: 30,
    },
    {
      title: 'Reserve Event Space & Confirm Equipment Logistics',
      category: 'Venue',
      priority: 'HIGH',
      notes: 'Confirm tables, chairs, AV screen, and wifi connectivity',
      isMilestone: false,
      relativePlacement: 0.35,
      standardDaysBefore: 20,
    },
    {
      title: 'Arrange Catering & Coffee/Tea Refreshment Station',
      category: 'Catering',
      priority: 'MEDIUM',
      notes: 'Provide beverage service and dietary snack options',
      isMilestone: false,
      relativePlacement: 0.55,
      standardDaysBefore: 14,
    },
    {
      title: 'Distribute Invitations & Agenda to Attendees',
      category: 'Invitations',
      priority: 'MEDIUM',
      notes: 'Send digital calendar invite and confirm speaking slots',
      isMilestone: true,
      relativePlacement: 0.7,
      standardDaysBefore: 8,
    },
    {
      title: 'Final Day-of Run-of-Show & Lead Coordinator Briefing',
      category: 'Coordination',
      priority: 'HIGH',
      notes: 'Run audio check, print name tags, and verify presentation slides',
      isMilestone: true,
      relativePlacement: 0.95,
      standardDaysBefore: 1,
    },
  ],
};

/**
 * Generates an intelligent, sensible starter checklist based on event type and date.
 * Handles events created close to their date (e.g., today, tomorrow, or a few days away)
 * by compressing the timeline so all tasks are due between today and the event date,
 * ensuring no tasks have invalid past dates and urgent tasks are prioritized.
 */
export function generateStarterChecklist(
  eventType: string,
  eventDateStr: string,
  eventId: string,
  refDateStr?: string
): Task[] {
  const normType = (eventType || 'OTHER').toUpperCase();
  const blueprints = TEMPLATES[normType] || TEMPLATES.OTHER;

  const ref = refDateStr ? parseDateOnly(refDateStr) : new Date();
  ref.setHours(0, 0, 0, 0);

  const eventDate = parseDateOnly(eventDateStr);
  const totalDays = getDaysDifference(eventDateStr, refDateStr);

  const nowIso = new Date().toISOString();

  return blueprints.map((bp, index) => {
    let taskDue: Date;
    let effectivePriority: TaskPriority = bp.priority;

    if (totalDays <= 0) {
      // Event is today or in the past: all starter tasks are due today
      taskDue = new Date(ref);
      effectivePriority = bp.priority === 'LOW' ? 'MEDIUM' : 'URGENT';
    } else if (totalDays === 1) {
      // Event is tomorrow: split between today and tomorrow, boost urgency
      taskDue = bp.relativePlacement <= 0.5 ? new Date(ref) : new Date(eventDate);
      effectivePriority = bp.isMilestone ? 'URGENT' : 'HIGH';
    } else if (totalDays <= 3) {
      // 2-3 days away: tightly compress between today and eventDate - 1
      const offset = Math.min(
        totalDays,
        Math.max(0, Math.floor(bp.relativePlacement * (totalDays + 1)))
      );
      taskDue = new Date(ref);
      taskDue.setDate(taskDue.getDate() + offset);
      if (taskDue > eventDate) taskDue = new Date(eventDate);
      effectivePriority = bp.priority === 'LOW' ? 'HIGH' : 'URGENT';
    } else if (totalDays <= 14) {
      // 4-14 days away: compress proportionally across available span
      const offset = Math.min(
        totalDays,
        Math.max(0, Math.round(bp.relativePlacement * totalDays))
      );
      taskDue = new Date(ref);
      taskDue.setDate(taskDue.getDate() + offset);
      if (taskDue > eventDate) taskDue = new Date(eventDate);
      // Tight timeline elevates urgency
      if (bp.relativePlacement <= 0.4 && effectivePriority === 'MEDIUM') {
        effectivePriority = 'HIGH';
      }
    } else {
      // Ample time: use ideal days before event, bounded by ref date
      const idealDate = new Date(eventDate);
      idealDate.setDate(idealDate.getDate() - bp.standardDaysBefore);

      if (idealDate < ref) {
        // If ideal date is before event creation/today, compress smoothly between ref and eventDate
        const proportionalOffset = Math.round(bp.relativePlacement * totalDays);
        taskDue = new Date(ref);
        taskDue.setDate(taskDue.getDate() + proportionalOffset);
      } else {
        taskDue = idealDate;
      }

      if (taskDue > eventDate) taskDue = new Date(eventDate);
    }

    const dueIso = formatDateToIsoString(taskDue);

    return {
      id: `tsk-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      title: bp.title,
      description: bp.notes,
      notes: bp.notes,
      category: bp.category,
      priority: effectivePriority,
      status: 'TODO' as TaskStatus,
      dueDate: dueIso,
      orderIndex: index + 1,
      isMilestone: bp.isMilestone,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}
