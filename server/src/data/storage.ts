import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  Event, 
  BudgetItem, 
  Task, 
  RunOfShowItem, 
  Vendor,
  EventWithDetails
} from '../types/index.js';
import { 
  initialEvents, 
  initialBudgetItems, 
  initialTasks, 
  initialRunOfShow, 
  initialVendors 
} from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface AppDataStore {
  events: Event[];
  budgetItems: BudgetItem[];
  tasks: Task[];
  runOfShowItems: RunOfShowItem[];
  vendors: Vendor[];
}

class StorageEngine {
  private data: AppDataStore;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): AppDataStore {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const fileContent = fs.readFileSync(STORE_FILE, 'utf-8');
        return JSON.parse(fileContent);
      }
    } catch (err) {
      console.warn('Failed to read store file, falling back to seed data:', err);
    }

    const defaultData: AppDataStore = {
      events: [...initialEvents],
      budgetItems: [...initialBudgetItems],
      tasks: [...initialTasks],
      runOfShowItems: [...initialRunOfShow],
      vendors: [...initialVendors],
    };

    this.persist(defaultData);
    return defaultData;
  }

  private persist(dataToSave: AppDataStore = this.data): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting store file:', err);
    }
  }

  // ==========================================
  // EVENT OPERATIONS
  // ==========================================

  public getAllEvents(): Event[] {
    return [...this.data.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  public getEventById(id: string): EventWithDetails | null {
    const event = this.data.events.find(e => e.id === id);
    if (!event) return null;

    const budgetItems = this.data.budgetItems.filter(b => b.eventId === id);
    const tasks = this.data.tasks.filter(t => t.eventId === id).sort((a, b) => a.orderIndex - b.orderIndex);
    const runOfShowItems = this.data.runOfShowItems.filter(r => r.eventId === id).sort((a, b) => a.orderIndex - b.orderIndex);
    const vendors = this.data.vendors.filter(v => v.eventId === id);

    const totalEstimatedBudget = budgetItems.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
    const totalActualCost = budgetItems.reduce((acc, curr) => acc + (curr.actualCost || 0), 0);
    const remainingBudget = event.totalBudget - totalActualCost;
    const budgetVariance = event.totalBudget - totalEstimatedBudget;

    const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasksCount = tasks.length;
    const tasksProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const bookedVendorsCount = vendors.filter(v => v.status === 'BOOKED' || v.status === 'COMPLETED').length;
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
      }
    };
  }

  public createEvent(eventInput: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
    const now = new Date().toISOString();
    const newEvent: Event = {
      ...eventInput,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.events.push(newEvent);
    this.persist();
    return newEvent;
  }

  public updateEvent(id: string, updates: Partial<Event>): Event | null {
    const index = this.data.events.findIndex(e => e.id === id);
    if (index === -1) return null;

    const updated: Event = {
      ...this.data.events[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.events[index] = updated;
    this.persist();
    return updated;
  }

  public deleteEvent(id: string): boolean {
    const initialLen = this.data.events.length;
    this.data.events = this.data.events.filter(e => e.id !== id);
    if (this.data.events.length === initialLen) return false;

    // Cascade delete associated items
    this.data.budgetItems = this.data.budgetItems.filter(b => b.eventId !== id);
    this.data.tasks = this.data.tasks.filter(t => t.eventId !== id);
    this.data.runOfShowItems = this.data.runOfShowItems.filter(r => r.eventId !== id);
    this.data.vendors = this.data.vendors.filter(v => v.eventId !== id);

    this.persist();
    return true;
  }

  // ==========================================
  // BUDGET OPERATIONS
  // ==========================================

  public getBudgetItems(eventId: string): BudgetItem[] {
    return this.data.budgetItems.filter(b => b.eventId === eventId);
  }

  public addBudgetItem(eventId: string, item: Omit<BudgetItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): BudgetItem {
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

  public updateBudgetItem(id: string, updates: Partial<BudgetItem>): BudgetItem | null {
    const idx = this.data.budgetItems.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.data.budgetItems[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.budgetItems[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteBudgetItem(id: string): boolean {
    const prevLen = this.data.budgetItems.length;
    this.data.budgetItems = this.data.budgetItems.filter(b => b.id !== id);
    this.persist();
    return this.data.budgetItems.length < prevLen;
  }

  // ==========================================
  // TASK OPERATIONS
  // ==========================================

  public getTasks(eventId: string): Task[] {
    return this.data.tasks
      .filter(t => t.eventId === eventId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public addTask(eventId: string, task: Omit<Task, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Task {
    const now = new Date().toISOString();
    const existing = this.getTasks(eventId);
    const newTask: Task = {
      ...task,
      id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      orderIndex: task.orderIndex ?? (existing.length + 1),
      createdAt: now,
      updatedAt: now,
    };
    this.data.tasks.push(newTask);
    this.persist();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.tasks[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteTask(id: string): boolean {
    const prevLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.persist();
    return this.data.tasks.length < prevLen;
  }

  // ==========================================
  // RUN OF SHOW (DAY-OF TIMELINE) OPERATIONS
  // ==========================================

  public getRunOfShow(eventId: string): RunOfShowItem[] {
    return this.data.runOfShowItems
      .filter(r => r.eventId === eventId)
      .sort((a, b) => a.orderIndex - b.orderIndex || a.startTime.localeCompare(b.startTime));
  }

  public addRunOfShowItem(eventId: string, item: Omit<RunOfShowItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): RunOfShowItem {
    const now = new Date().toISOString();
    const existing = this.getRunOfShow(eventId);
    const newItem: RunOfShowItem = {
      ...item,
      id: `ros-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      orderIndex: item.orderIndex ?? (existing.length + 1),
      createdAt: now,
      updatedAt: now,
    };
    this.data.runOfShowItems.push(newItem);
    this.persist();
    return newItem;
  }

  public updateRunOfShowItem(id: string, updates: Partial<RunOfShowItem>): RunOfShowItem | null {
    const idx = this.data.runOfShowItems.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.data.runOfShowItems[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.runOfShowItems[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteRunOfShowItem(id: string): boolean {
    const prevLen = this.data.runOfShowItems.length;
    this.data.runOfShowItems = this.data.runOfShowItems.filter(r => r.id !== id);
    this.persist();
    return this.data.runOfShowItems.length < prevLen;
  }

  // ==========================================
  // VENDOR OPERATIONS
  // ==========================================

  public getVendors(eventId: string): Vendor[] {
    return this.data.vendors.filter(v => v.eventId === eventId);
  }

  public addVendor(eventId: string, vendor: Omit<Vendor, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Vendor {
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

  public updateVendor(id: string, updates: Partial<Vendor>): Vendor | null {
    const idx = this.data.vendors.findIndex(v => v.id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.data.vendors[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.data.vendors[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteVendor(id: string): boolean {
    const prevLen = this.data.vendors.length;
    this.data.vendors = this.data.vendors.filter(v => v.id !== id);
    this.persist();
    return this.data.vendors.length < prevLen;
  }

  // Reset to seed if needed
  public resetToSeed(): void {
    this.data = {
      events: [...initialEvents],
      budgetItems: [...initialBudgetItems],
      tasks: [...initialTasks],
      runOfShowItems: [...initialRunOfShow],
      vendors: [...initialVendors],
    };
    this.persist();
  }
}

export const storage = new StorageEngine();
