import { z } from 'zod';
import { 
  Event, 
  EventWithDetails, 
  BudgetItem, 
  Task, 
  RunOfShowItem, 
  Vendor,
  GeneratedAiPlan
} from '../types/index.js';
import { calculateBudgetMetrics } from '../utils/budgetCalculations.js';
import { generateStarterChecklist } from '../utils/taskCalculations.js';

const STORAGE_KEY = 'EVERFEST_STORE_V1';

// ==========================================
// ZOD VALIDATION SCHEMAS FOR PERSISTENCE
// ==========================================

const BudgetItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  category: z.any(),
  name: z.string(),
  estimatedCost: z.number().nonnegative(),
  actualCost: z.number().nonnegative().default(0),
  paymentStatus: z.any(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  vendorId: z.string().optional(),
  isEstimate: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TaskSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
  assignee: z.string().optional(),
  category: z.string().optional(),
  priority: z.any(),
  status: z.any(),
  dueDate: z.string().optional(),
  orderIndex: z.number().default(0),
  isMilestone: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const RunOfShowSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  picName: z.string().optional(),
  orderIndex: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const VendorSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  category: z.string().default('OTHER'),
  status: z.string().default('RESEARCHING'),
  contactPerson: z.string().optional(),
  contactDetails: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  quotedPrice: z.number().optional(),
  quotedAmount: z.number().optional(),
  contractAmount: z.number().optional(),
  notes: z.string().optional(),
  budgetCategory: z.string().optional(),
  budgetItemId: z.string().optional(),
  isDemo: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  eventType: z.string().default('OTHER'),
  status: z.string().default('PLANNING'),
  date: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationName: z.string().optional(),
  locationAddress: z.string().optional(),
  estimatedGuests: z.number().default(50),
  totalBudget: z.number().default(5000),
  currency: z.string().optional().default('USD'),
  themeAesthetic: z.string().optional(),
  colorPalette: z.array(z.string()).optional(),
  dietaryNeeds: z.array(z.string()).optional(),
  accessibilityNeeds: z.array(z.string()).optional(),
  specialPreferences: z.string().optional(),
  isDemo: z.boolean().optional(),
  notes: z.string().optional(),
  savedCreativeIdeas: z.any().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const StorageSchema = z.object({
  version: z.number().default(1),
  events: z.array(EventSchema),
  budgetItems: z.array(BudgetItemSchema),
  tasks: z.array(TaskSchema),
  runOfShowItems: z.array(RunOfShowSchema),
  vendors: z.array(VendorSchema),
});

export interface StorageData {
  version: number;
  events: Event[];
  budgetItems: BudgetItem[];
  tasks: Task[];
  runOfShowItems: RunOfShowItem[];
  vendors: Vendor[];
}

// Helper to calculate future date ISO string
const getFutureDate = (daysAhead: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

// ==========================================
// TASTEFUL SAMPLE DEMO DATA
// ==========================================

export const createDemoData = (): StorageData => {
  const demoEventDate = getFutureDate(45);
  const nowIso = new Date().toISOString();

  const demoEvent: Event = {
    id: 'evt-demo-vineyard',
    title: "[Demo] Aurelia & Julian's Autumn Vineyard Wedding",
    description: "An intimate, candlelit celebration set among Napa Valley vineyards featuring a 3-course organic dinner and live jazz trio.",
    eventType: 'WEDDING',
    status: 'PLANNING',
    date: demoEventDate,
    startTime: '15:30',
    endTime: '23:30',
    locationName: 'Bella Vista Vineyards & Lawn Pavilion',
    locationAddress: '1482 Hilltop Road, Sonoma Valley, CA',
    estimatedGuests: 125,
    totalBudget: 28000,
    currency: 'USD',
    themeAesthetic: 'Romantic Autumn Warmth & Candlelight',
    colorPalette: ['#882A36', '#CBA83E', '#D8A47F', '#2E382B', '#FAF7F2'],
    dietaryNeeds: ['Gluten-Free (8 guests)', 'Vegan Options (4 guests)', 'Nut-Free Table'],
    accessibilityNeeds: ['Wheelchair Accessible Pavilion Ramp', 'Low-Incline Pathways', 'Quiet Break Area'],
    specialPreferences: 'Acoustic string quartet during prelude, sparkler send-off at 23:15, no flash photography during vows.',
    isDemo: true,
    notes: 'Outside cake permitted. Final catering guest count due 14 days prior.',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const demoBudget: BudgetItem[] = [
    {
      id: 'bgt-demo-1',
      eventId: 'evt-demo-vineyard',
      category: 'VENUE',
      name: 'Estate Lawn & Pavilion Rental',
      estimatedCost: 8500,
      actualCost: 8500,
      paymentStatus: 'PAID_IN_FULL',
      dueDate: getFutureDate(-20),
      notes: 'Includes tables, chivari chairs, and private bridal suite',
      isEstimate: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-2',
      eventId: 'evt-demo-vineyard',
      category: 'CATERING',
      name: 'Farm-to-Table 3-Course Dinner & Canapes',
      estimatedCost: 9500,
      actualCost: 4750,
      paymentStatus: 'DEPOSIT_PAID',
      dueDate: getFutureDate(14),
      notes: '50% balance due 2 weeks before event',
      isEstimate: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-3',
      eventId: 'evt-demo-vineyard',
      category: 'DECORATIONS',
      name: 'Ceremony Arch, Terracotta Centerpieces & Candlelight',
      estimatedCost: 2800,
      actualCost: 1400,
      paymentStatus: 'DEPOSIT_PAID',
      dueDate: getFutureDate(25),
      notes: 'Dahlia arrangements and pillar candles on wooden harvest tables',
      isEstimate: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-4',
      eventId: 'evt-demo-vineyard',
      category: 'PHOTOGRAPHY',
      name: 'Full Day Documentary Photography & Drone Coverage',
      estimatedCost: 3500,
      actualCost: 1500,
      paymentStatus: 'DEPOSIT_PAID',
      dueDate: getFutureDate(30),
      notes: '10 hours coverage + high-res digital gallery',
      isEstimate: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-5',
      eventId: 'evt-demo-vineyard',
      category: 'ENTERTAINMENT',
      name: 'Acoustic String Quartet (Ceremony) & DJ (Reception)',
      estimatedCost: 2200,
      actualCost: 1100,
      paymentStatus: 'DEPOSIT_PAID',
      dueDate: getFutureDate(35),
      notes: 'Includes wireless ceremony lapel microphones and dance lighting',
      isEstimate: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-6',
      eventId: 'evt-demo-vineyard',
      category: 'INVITATIONS',
      name: 'Letterpress Foil Invitation Suite & Digital RSVP Portal',
      estimatedCost: 850,
      actualCost: 850,
      paymentStatus: 'PAID_IN_FULL',
      dueDate: getFutureDate(-10),
      notes: 'Hand-pressed cotton paper with sage botanical wax seals',
      isEstimate: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-7',
      eventId: 'evt-demo-vineyard',
      category: 'TRANSPORT',
      name: 'Guest Shuttle Vans & Vintage Getaway Cabriolet',
      estimatedCost: 1200,
      actualCost: 0,
      paymentStatus: 'UNPAID',
      dueDate: getFutureDate(40),
      notes: 'Continuous loop shuttles between downtown hotels and vineyard estate',
      isEstimate: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'bgt-demo-8',
      eventId: 'evt-demo-vineyard',
      category: 'CONTINGENCY',
      name: 'Incidental Weather & Overtime Emergency Buffer',
      estimatedCost: 1800,
      actualCost: 0,
      paymentStatus: 'UNPAID',
      dueDate: getFutureDate(44),
      notes: 'Reserved reserve cushion for unexpected vendor overtime or tent heating',
      isEstimate: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const demoTasks: Task[] = [
    {
      id: 'tsk-demo-1',
      eventId: 'evt-demo-vineyard',
      title: 'Sign Vineyard Venue Contract',
      description: 'Confirm noise ordinance curfew (23:00) and tent permits.',
      category: 'Venue',
      priority: 'URGENT',
      status: 'COMPLETED',
      dueDate: getFutureDate(-30),
      orderIndex: 1,
      isMilestone: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tsk-demo-2',
      eventId: 'evt-demo-vineyard',
      title: 'Menu Tasting & Wine Selection',
      description: 'Confirm 3 entree options, vegan tasting, and elderflower welcome cocktail.',
      category: 'Catering',
      priority: 'HIGH',
      status: 'COMPLETED',
      dueDate: getFutureDate(-15),
      orderIndex: 2,
      isMilestone: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tsk-demo-3',
      eventId: 'evt-demo-vineyard',
      title: 'Send Formal Invitations & Launch RSVP Link',
      description: 'Include dietary preference checkboxes and accessibility guidelines.',
      category: 'Invitations',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: getFutureDate(5),
      orderIndex: 3,
      isMilestone: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tsk-demo-4',
      eventId: 'evt-demo-vineyard',
      title: 'Final Floral Mockup & Table Dimensions',
      description: 'Inspect terracotta dahlia arrangements with vineyard coordinator.',
      category: 'Decor',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: getFutureDate(18),
      orderIndex: 4,
      isMilestone: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'tsk-demo-5',
      eventId: 'evt-demo-vineyard',
      title: 'Distribute Day-Of Run-of-Show to Vendors',
      description: 'Share minute-by-minute schedule cheat-sheet with DJ, photographer, and MC.',
      category: 'Coordination',
      priority: 'HIGH',
      status: 'TODO',
      dueDate: getFutureDate(35),
      orderIndex: 5,
      isMilestone: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const demoRunOfShow: RunOfShowItem[] = [
    {
      id: 'ros-demo-1',
      eventId: 'evt-demo-vineyard',
      startTime: '13:00',
      endTime: '15:00',
      title: 'Pre-Ceremony Hair, Makeup & Portraits',
      description: 'Bridal suite staging, detail photos, bridal party first looks.',
      location: 'Bridal Suite & Upper Balcony',
      picName: 'Sophie Bennett (Photographer)',
      orderIndex: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ros-demo-2',
      eventId: 'evt-demo-vineyard',
      startTime: '15:15',
      endTime: '15:45',
      title: 'Guest Arrival & Acoustic Prelude',
      description: 'Guests greeted with infused water & spritz; acoustic quartet playing.',
      location: 'Vineyard Pergola Lawn',
      picName: 'Usher Team Lead',
      orderIndex: 2,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ros-demo-3',
      eventId: 'evt-demo-vineyard',
      startTime: '16:00',
      endTime: '16:45',
      title: 'Wedding Ceremony',
      description: 'Processional, vows exchange, ring blessings, and recessional cheer.',
      location: 'Oak Tree Ceremony Altar',
      picName: 'Officiant & Wedding Coordinator',
      orderIndex: 3,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ros-demo-4',
      eventId: 'evt-demo-vineyard',
      startTime: '17:00',
      endTime: '18:15',
      title: 'Sunset Cocktails & Golden Hour Photos',
      description: 'Hors d’oeuvres circulated; couple sneaks away for sunset session.',
      location: 'Garden Terrace',
      picName: 'Banquet Lead',
      orderIndex: 4,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ros-demo-5',
      eventId: 'evt-demo-vineyard',
      startTime: '18:30',
      endTime: '20:15',
      title: 'Plated Dinner Banquet & Toasts',
      description: '3-course plated dinner followed by speeches from family and friends.',
      location: 'Lawn Pavilion Tent',
      picName: 'Banquet Captain & MC',
      orderIndex: 5,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'ros-demo-6',
      eventId: 'evt-demo-vineyard',
      startTime: '20:30',
      endTime: '23:15',
      title: 'First Dance & Open Dance Floor',
      description: 'Special dances followed by live DJ set and late night dessert bar.',
      location: 'Pavilion Dance Floor',
      picName: 'DJ & MC',
      orderIndex: 6,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const demoVendors: Vendor[] = [
    {
      id: 'vnd-demo-1',
      eventId: 'evt-demo-vineyard',
      name: '[Demo] Bella Vista Vineyards',
      category: 'VENUE',
      status: 'BOOKED',
      contactPerson: 'Clara Hughes',
      contactDetails: 'Clara Hughes • (707) 555-0192',
      email: 'events@bellavistavineyards.example.com',
      phone: '(707) 555-0192',
      website: 'https://bellavistavineyards.example.com',
      quotedPrice: 8500,
      quotedAmount: 8500,
      contractAmount: 8500,
      budgetCategory: 'VENUE',
      isDemo: true,
      notes: '[Simulated Demo Partner] On-site lead Clara Hughes present on event day. Sound curfew strictly 23:00. Provided for budget illustration.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'vnd-demo-2',
      eventId: 'evt-demo-vineyard',
      name: '[Demo] Heritage Farm Table Catering',
      category: 'CATERING',
      status: 'BOOKED',
      contactPerson: 'Chef Mateo Rossi',
      contactDetails: 'Chef Mateo • (707) 555-8831',
      email: 'mateo@heritagefarmtable.example.com',
      phone: '(707) 555-8831',
      website: 'https://heritagefarmtable.example.com',
      quotedPrice: 9500,
      quotedAmount: 9500,
      contractAmount: 9500,
      budgetCategory: 'CATERING',
      isDemo: true,
      notes: '[Simulated Demo Partner] Organic local farm sourcing. Gluten-free and vegan plates tagged with custom flags. Provided for budget illustration.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'vnd-demo-3',
      eventId: 'evt-demo-vineyard',
      name: '[Demo] Lumiere Moments Photography',
      category: 'PHOTOGRAPHY',
      status: 'BOOKED',
      contactPerson: 'Sophie Bennett',
      contactDetails: 'Sophie Bennett • (415) 555-3042',
      email: 'sophie@lumieremoments.example.com',
      phone: '(415) 555-3042',
      website: 'https://lumieremoments.example.com',
      quotedPrice: 3500,
      quotedAmount: 3500,
      contractAmount: 3500,
      budgetCategory: 'PHOTOGRAPHY',
      isDemo: true,
      notes: '[Simulated Demo Partner] Includes second shooter and drone aerial vineyard coverage. Provided for budget illustration.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'vnd-demo-4',
      eventId: 'evt-demo-vineyard',
      name: '[Demo] Velvet & Vow Styling & Florals',
      category: 'DECORATION',
      status: 'QUOTED',
      contactPerson: 'Liam Vance',
      contactDetails: 'Liam Vance • (707) 555-7729',
      email: 'liam@velvetandvow.example.com',
      phone: '(707) 555-7729',
      website: 'https://velvetandvow.example.com',
      quotedPrice: 2800,
      quotedAmount: 2800,
      budgetCategory: 'DECORATIONS',
      isDemo: true,
      notes: '[Simulated Demo Partner] Awaiting revised sample board with terracotta dahlias and bronze candelabras. Provided for budget illustration.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'vnd-demo-5',
      eventId: 'evt-demo-vineyard',
      name: '[Demo] Golden Gate Jazz Trio',
      category: 'ENTERTAINMENT',
      status: 'CONTACTED',
      contactPerson: 'Marcus Hayes',
      contactDetails: 'Marcus Hayes • (415) 555-9120',
      email: 'marcus@goldengatejazz.example.com',
      phone: '(415) 555-9120',
      quotedPrice: 1800,
      quotedAmount: 1800,
      budgetCategory: 'ENTERTAINMENT',
      isDemo: true,
      notes: '[Simulated Demo Partner] Acoustic prelude and 90-minute sunset cocktail set. Provided for budget illustration.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'vnd-demo-6',
      eventId: 'evt-demo-vineyard',
      name: '[Demo] Napa Valley Luxury Charters',
      category: 'TRANSPORT',
      status: 'RESEARCHING',
      contactPerson: 'Dispatch Desk',
      contactDetails: 'Dispatch • (707) 555-4411',
      email: 'dispatch@napacharters.example.com',
      phone: '(707) 555-4411',
      quotedPrice: 1200,
      quotedAmount: 1200,
      budgetCategory: 'TRANSPORT',
      isDemo: true,
      notes: '[Simulated Demo Partner] Twin 24-passenger executive sprinter shuttles for guest loop between downtown hotels. Provided for budget illustration.',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return {
    version: 1,
    events: [demoEvent],
    budgetItems: demoBudget,
    tasks: demoTasks,
    runOfShowItems: demoRunOfShow,
    vendors: demoVendors,
  };
};

// ==========================================
// ==========================================
// STORAGE ABSTRACTION & LOCAL STORAGE DAL
// ==========================================

export interface SimpleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

const memoryStore: Map<string, string> = new Map();

export const memoryStorage: SimpleStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => { memoryStore.set(key, value); },
  removeItem: (key) => { memoryStore.delete(key); },
  clear: () => { memoryStore.clear(); },
};

export class StorageDal {
  private data: StorageData;

  constructor() {
    this.data = this.loadSafe();
  }

  public getStorage(): SimpleStorage {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return memoryStorage;
  }

  /**
   * Safely loads data from LocalStorage, validating structure with Zod.
   * If corrupted or missing, falls back to demo data without throwing.
   */
  private loadSafe(): StorageData {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = createDemoData();
        this.saveDirect(initial);
        return initial;
      }

      const parsedJson = JSON.parse(raw);
      const validation = StorageSchema.safeParse(parsedJson);

      if (validation.success) {
        return validation.data as unknown as StorageData;
      } else {
        console.warn('LocalStorage data failed validation. Safely repairing store with demo baseline:', validation.error);
        const repaired = createDemoData();
        this.saveDirect(repaired);
        return repaired;
      }
    } catch (err) {
      console.warn('Malformed or unreadable LocalStorage data detected. Safely recovering with demo baseline:', err);
      const fresh = createDemoData();
      this.saveDirect(fresh);
      return fresh;
    }
  }

  private saveDirect(dataToSave: StorageData): void {
    try {
      this.getStorage().setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error('LocalStorage write error:', err);
    }
  }

  private persist(): void {
    this.saveDirect(this.data);
  }

  // ==========================================
  // EVENT OPERATIONS
  // ==========================================

  public async getEvents(): Promise<Event[]> {
    this.data = this.loadSafe();
    return [...this.data.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  public async getEventById(id: string): Promise<EventWithDetails | null> {
    this.data = this.loadSafe();
    const event = this.data.events.find((e) => e.id === id);
    if (!event) return null;

    const budgetItems = this.data.budgetItems.filter((b) => b.eventId === id);
    const tasks = this.data.tasks.filter((t) => t.eventId === id).sort((a, b) => a.orderIndex - b.orderIndex);
    const runOfShowItems = this.data.runOfShowItems.filter((r) => r.eventId === id).sort((a, b) => a.orderIndex - b.orderIndex);
    const vendors = this.data.vendors.filter((v) => v.eventId === id);

    const budgetMetrics = calculateBudgetMetrics(event.totalBudget, budgetItems);
    const totalEstimatedBudget = budgetMetrics.estimatedTotal;
    const totalActualCost = budgetMetrics.actualSpend;
    const remainingBudget = budgetMetrics.remainingBudget;
    const budgetVariance = budgetMetrics.budgetVariance;

    const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const totalTasksCount = tasks.length;
    const tasksProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const bookedVendorsCount = vendors.filter((v) => v.status === 'BOOKED' || v.status === 'COMPLETED').length;
    const totalVendorsCount = vendors.length;

    return {
      ...event,
      budgetItems,
      tasks,
      runOfShowItems,
      vendors,
      metrics: {
        totalEstimatedBudget,
        totalActualCost,
        remainingBudget,
        budgetVariance,
        completedTasksCount,
        totalTasksCount,
        tasksProgressPercent,
        bookedVendorsCount,
        totalVendorsCount,
      },
    };
  }

  public async createEvent(input: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    this.data = this.loadSafe();
    const now = new Date().toISOString();
    const newEvent: Event = {
      ...input,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.events.push(newEvent);

    // Automatically generate and link starter checklist based on event type and date
    const starterTasks = generateStarterChecklist(newEvent.eventType, newEvent.date, newEvent.id);
    this.data.tasks.push(...starterTasks);

    this.persist();
    return newEvent;
  }

  public async generateStarterTasks(eventId: string): Promise<Task[]> {
    this.data = this.loadSafe();
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Event ${eventId} not found`);

    const starterTasks = generateStarterChecklist(event.eventType, event.date, event.id);
    this.data.tasks.push(...starterTasks);
    this.persist();
    return starterTasks;
  }

  public async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    this.data = this.loadSafe();
    const idx = this.data.events.findIndex((e) => e.id === id);
    if (idx === -1) {
      throw new Error(`Event ${id} not found`);
    }

    const updated: Event = {
      ...this.data.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.events[idx] = updated;
    this.persist();
    return updated;
  }

  public async deleteEvent(id: string): Promise<boolean> {
    this.data = this.loadSafe();
    const prevCount = this.data.events.length;
    this.data.events = this.data.events.filter((e) => e.id !== id);

    // Cascade delete associated items
    this.data.budgetItems = this.data.budgetItems.filter((b) => b.eventId !== id);
    this.data.tasks = this.data.tasks.filter((t) => t.eventId !== id);
    this.data.runOfShowItems = this.data.runOfShowItems.filter((r) => r.eventId !== id);
    this.data.vendors = this.data.vendors.filter((v) => v.eventId !== id);

    this.persist();
    return this.data.events.length < prevCount;
  }

  // ==========================================
  // BUDGET OPERATIONS
  // ==========================================

  public async getBudgetItems(eventId: string): Promise<BudgetItem[]> {
    this.data = this.loadSafe();
    return this.data.budgetItems.filter((b) => b.eventId === eventId);
  }

  public async addBudgetItem(eventId: string, item: Omit<BudgetItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<BudgetItem> {
    this.data = this.loadSafe();
    const now = new Date().toISOString();
    const newItem: BudgetItem = {
      ...item,
      id: `bgt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      createdAt: now,
      updatedAt: now,
    };
    this.data.budgetItems.push(newItem);
    this.persist();
    return newItem;
  }

  public async updateBudgetItem(id: string, updates: Partial<BudgetItem>): Promise<BudgetItem> {
    this.data = this.loadSafe();
    const idx = this.data.budgetItems.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error(`Budget item ${id} not found`);
    const updated = {
      ...this.data.budgetItems[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.budgetItems[idx] = updated;
    this.persist();
    return updated;
  }

  public async deleteBudgetItem(id: string): Promise<boolean> {
    this.data = this.loadSafe();
    const prev = this.data.budgetItems.length;
    this.data.budgetItems = this.data.budgetItems.filter((b) => b.id !== id);
    this.persist();
    return this.data.budgetItems.length < prev;
  }

  public async deleteBudgetCategory(eventId: string, category: string): Promise<number> {
    this.data = this.loadSafe();
    const initialCount = this.data.budgetItems.length;
    this.data.budgetItems = this.data.budgetItems.filter(
      (b) => !(b.eventId === eventId && b.category === category)
    );
    const removedCount = initialCount - this.data.budgetItems.length;
    this.persist();
    return removedCount;
  }

  public async updateBudgetCategory(
    eventId: string, 
    oldCategory: string, 
    newCategory: string
  ): Promise<number> {
    this.data = this.loadSafe();
    let updatedCount = 0;
    const now = new Date().toISOString();
    this.data.budgetItems = this.data.budgetItems.map((b) => {
      if (b.eventId === eventId && b.category === oldCategory) {
        updatedCount++;
        return {
          ...b,
          category: newCategory,
          updatedAt: now,
        };
      }
      return b;
    });
    this.persist();
    return updatedCount;
  }

  // ==========================================
  // TASK OPERATIONS
  // ==========================================

  public async getTasks(eventId: string): Promise<Task[]> {
    this.data = this.loadSafe();
    return this.data.tasks.filter((t) => t.eventId === eventId);
  }

  public async getAllUpcomingDeadlines(): Promise<Array<Task & { eventTitle: string; eventType: string }>> {
    this.data = this.loadSafe();
    const eventMap = new Map<string, Event>();
    for (const e of this.data.events) {
      eventMap.set(e.id, e);
    }

    const tasksWithDueDate = this.data.tasks
      .filter((t) => !!t.dueDate)
      .map((t) => {
        const ev = eventMap.get(t.eventId);
        return {
          ...t,
          eventTitle: ev ? ev.title : 'Celebration',
          eventType: ev ? ev.eventType : 'OTHER',
        };
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return tasksWithDueDate;
  }

  public async addTask(eventId: string, task: Omit<Task, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    this.data = this.loadSafe();
    const now = new Date().toISOString();
    const existing = this.data.tasks.filter((t) => t.eventId === eventId);
    const newTask: Task = {
      ...task,
      id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      orderIndex: task.orderIndex ?? existing.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.data.tasks.push(newTask);
    this.persist();
    return newTask;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    this.data = this.loadSafe();
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Task ${id} not found`);
    const updated = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.tasks[idx] = updated;
    this.persist();
    return updated;
  }

  public async deleteTask(id: string): Promise<boolean> {
    this.data = this.loadSafe();
    const prev = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this.persist();
    return this.data.tasks.length < prev;
  }

  // ==========================================
  // RUN OF SHOW OPERATIONS
  // ==========================================

  public async getRunOfShow(eventId: string): Promise<RunOfShowItem[]> {
    this.data = this.loadSafe();
    return this.data.runOfShowItems
      .filter((r) => r.eventId === eventId)
      .sort((a, b) => a.orderIndex - b.orderIndex || a.startTime.localeCompare(b.startTime));
  }

  public async addRunOfShowItem(eventId: string, item: Omit<RunOfShowItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<RunOfShowItem> {
    this.data = this.loadSafe();
    const now = new Date().toISOString();
    const existing = this.data.runOfShowItems.filter((r) => r.eventId === eventId);
    const newItem: RunOfShowItem = {
      ...item,
      id: `ros-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      orderIndex: item.orderIndex ?? existing.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    this.data.runOfShowItems.push(newItem);
    this.persist();
    return newItem;
  }

  public async updateRunOfShowItem(id: string, updates: Partial<RunOfShowItem>): Promise<RunOfShowItem> {
    this.data = this.loadSafe();
    const idx = this.data.runOfShowItems.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Run of show item ${id} not found`);
    const updated = {
      ...this.data.runOfShowItems[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.runOfShowItems[idx] = updated;
    this.persist();
    return updated;
  }

  public async deleteRunOfShowItem(id: string): Promise<boolean> {
    this.data = this.loadSafe();
    const prev = this.data.runOfShowItems.length;
    this.data.runOfShowItems = this.data.runOfShowItems.filter((r) => r.id !== id);
    this.persist();
    return this.data.runOfShowItems.length < prev;
  }

  // ==========================================
  // VENDOR OPERATIONS
  // ==========================================

  public async getVendors(eventId: string): Promise<Vendor[]> {
    this.data = this.loadSafe();
    return this.data.vendors.filter((v) => v.eventId === eventId);
  }

  public async addVendor(eventId: string, vendor: Omit<Vendor, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    this.data = this.loadSafe();
    const now = new Date().toISOString();
    const newVendor: Vendor = {
      ...vendor,
      id: `vnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      createdAt: now,
      updatedAt: now,
    };
    this.data.vendors.push(newVendor);
    this.persist();
    return newVendor;
  }

  public async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor> {
    this.data = this.loadSafe();
    const idx = this.data.vendors.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error(`Vendor ${id} not found`);
    const updated = {
      ...this.data.vendors[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.data.vendors[idx] = updated;
    this.persist();
    return updated;
  }

  public async deleteVendor(id: string): Promise<boolean> {
    this.data = this.loadSafe();
    const prev = this.data.vendors.length;
    this.data.vendors = this.data.vendors.filter((v) => v.id !== id);
    this.persist();
    return this.data.vendors.length < prev;
  }

  // ==========================================
  // APPLY AI PLAN
  // ==========================================

  public async applyAiPlan(
    eventId: string, 
    plan: GeneratedAiPlan,
    options?: {
      applyTheme?: boolean;
      selectedBudgetIndices?: number[];
      selectedTaskIndices?: number[];
      selectedAgendaIndices?: number[];
      selectedVendorIndices?: number[];
    }
  ): Promise<{ message: string }> {
    this.data = this.loadSafe();
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Event ${eventId} not found`);

    // 1. Theme application (only if requested, default true)
    const shouldApplyTheme = options?.applyTheme !== false;
    const themeTitle = plan.theme?.title || plan.themeConcept?.title;
    const colorPalette = plan.theme?.colorPalette || plan.themeConcept?.colorPalette;
    if (shouldApplyTheme && themeTitle) {
      event.themeAesthetic = themeTitle;
      if (colorPalette && colorPalette.length > 0) {
        event.colorPalette = colorPalette;
      }
      event.updatedAt = new Date().toISOString();
    }

    // 2. Budget suggestions (appends selected items; NEVER overwrites existing user items)
    const budgetSource = plan.budgetSuggestions || plan.suggestedBudgetBreakdown || [];
    const budgetIndices = options?.selectedBudgetIndices ?? budgetSource.map((_, i) => i);
    for (const idx of budgetIndices) {
      const bgt = budgetSource[idx];
      if (bgt) {
        await this.addBudgetItem(eventId, {
          category: bgt.category,
          name: bgt.name,
          estimatedCost: bgt.estimatedCost,
          actualCost: 0,
          paymentStatus: 'UNPAID',
          notes: bgt.notes ? `${bgt.notes} [AI Suggestion]` : '[AI-Generated Estimate]',
          isEstimate: true,
        });
      }
    }

    // 3. Milestone tasks (appends selected items; NEVER overwrites existing user items)
    const tasksSource = plan.datedTasks || plan.milestoneTasks || [];
    const taskIndices = options?.selectedTaskIndices ?? tasksSource.map((_, i) => i);
    const eventDate = new Date(event.date);

    for (const idx of taskIndices) {
      const task = tasksSource[idx];
      if (task) {
        let taskDueDate = task.dueDate;
        if (!taskDueDate && !isNaN(eventDate.getTime())) {
          const d = new Date(eventDate);
          d.setDate(d.getDate() + (task.timelineOffsetDays || 0));
          taskDueDate = d.toISOString().split('T')[0];
        }

        await this.addTask(eventId, {
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          status: 'TODO',
          dueDate: taskDueDate,
          orderIndex: this.data.tasks.filter((t) => t.eventId === eventId).length + 1,
          isMilestone: task.isMilestone,
        });
      }
    }

    // 4. Run of show items (appends selected items; NEVER overwrites existing items)
    const agendaSource = plan.agenda || plan.runOfShow || [];
    const agendaIndices = options?.selectedAgendaIndices ?? agendaSource.map((_, i) => i);
    for (const idx of agendaIndices) {
      const ros = agendaSource[idx];
      if (ros) {
        await this.addRunOfShowItem(eventId, {
          startTime: ros.startTime,
          endTime: ros.endTime,
          title: ros.title,
          description: ros.description,
          location: ros.location,
          picName: ros.picName,
          orderIndex: this.data.runOfShowItems.filter((r) => r.eventId === eventId).length + 1,
        });
      }
    }

    // 5. Vendor recommendations (appends selected vendors into vendor directory)
    const vendorSource = plan.vendorCategories || plan.vendorRecommendations || [];
    const vendorIndices = options?.selectedVendorIndices ?? vendorSource.map((_, i) => i);
    for (const idx of vendorIndices) {
      const v = vendorSource[idx];
      if (v) {
        await this.addVendor(eventId, {
          name: v.name,
          category: v.category as any,
          status: 'RESEARCHING',
          quotedPrice: v.estimatedBudget,
          quotedAmount: v.estimatedBudget,
          notes: v.questionsToAsk && v.questionsToAsk.length > 0 
            ? `Recommended by AI. Screening questions: ${v.questionsToAsk.join(' | ')}`
            : 'Recommended by AI planner.',
          isDemo: true, // Clearly marked as unverified recommendation
        });
      }
    }

    this.persist();
    return { message: 'Selected blueprint components merged successfully without overwriting existing data!' };
  }

  // ==========================================
  // CREATIVE INSPIRATION & STUDIO PERSISTENCE
  // ==========================================

  public async saveCreativeIdeas(eventId: string, ideas: any): Promise<EventWithDetails> {
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Celebration with ID ${eventId} not found`);

    event.savedCreativeIdeas = ideas;
    event.updatedAt = new Date().toISOString();
    this.persist();
    const updated = await this.getEventById(eventId);
    if (!updated) throw new Error(`Failed to reload celebration ${eventId}`);
    return updated;
  }

  public async getCreativeIdeas(eventId: string): Promise<any | null> {
    const event = this.data.events.find((e) => e.id === eventId);
    return event?.savedCreativeIdeas || null;
  }

  public async applyCreativeTheme(
    eventId: string, 
    theme: { title: string; colorPalette?: string[] }
  ): Promise<EventWithDetails> {
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Celebration with ID ${eventId} not found`);

    event.themeAesthetic = theme.title;
    if (theme.colorPalette && theme.colorPalette.length > 0) {
      event.colorPalette = theme.colorPalette;
    }
    event.updatedAt = new Date().toISOString();
    this.persist();
    const updated = await this.getEventById(eventId);
    if (!updated) throw new Error(`Failed to reload celebration ${eventId}`);
    return updated;
  }

  public async applyCreativePalette(eventId: string, hexCodes: string[]): Promise<EventWithDetails> {
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Celebration with ID ${eventId} not found`);

    event.colorPalette = hexCodes;
    event.updatedAt = new Date().toISOString();
    this.persist();
    const updated = await this.getEventById(eventId);
    if (!updated) throw new Error(`Failed to reload celebration ${eventId}`);
    return updated;
  }

  public async saveInvitationWording(
    eventId: string, 
    styleLabel: string, 
    wording: string
  ): Promise<EventWithDetails> {
    const event = this.data.events.find((e) => e.id === eventId);
    if (!event) throw new Error(`Celebration with ID ${eventId} not found`);

    const wordingBlock = `\n\n--- Invitation Wording (${styleLabel}) ---\n${wording.trim()}`;
    event.notes = event.notes ? `${event.notes.trim()}${wordingBlock}` : wordingBlock.trim();
    event.updatedAt = new Date().toISOString();
    this.persist();
    const updated = await this.getEventById(eventId);
    if (!updated) throw new Error(`Failed to reload celebration ${eventId}`);
    return updated;
  }

  public async addCreativeActivityAsTask(
    eventId: string, 
    activity: { title: string; description: string; duration?: string }
  ): Promise<Task> {
    const existingCount = this.data.tasks.filter((t) => t.eventId === eventId).length;
    const newTask = await this.addTask(eventId, {
      title: activity.title,
      description: activity.duration 
        ? `${activity.description} (Estimated duration: ${activity.duration})` 
        : activity.description,
      category: 'Entertainment',
      priority: 'MEDIUM',
      status: 'TODO',
      orderIndex: existingCount + 1,
      isMilestone: false,
    });
    return newTask;
  }

  // Reset to sample demo data
  public resetToDemo(): void {
    const demo = createDemoData();
    this.data = demo;
    this.saveDirect(demo);
  }
}

export const storageDal = new StorageDal();
