import { storage } from '../data/storage.js';
import { Task, RunOfShowItem } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class TasksService {
  // ==========================================
  // MILESTONE TASKS
  // ==========================================

  public getTasks(eventId: string): Task[] {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.getTasks(eventId);
  }

  public addTask(eventId: string, data: Omit<Task, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Task {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.addTask(eventId, data);
  }

  public updateTask(id: string, updates: Partial<Task>): Task {
    const updated = storage.updateTask(id, updates);
    if (!updated) {
      throw new AppError(`Task with id '${id}' not found`, 404);
    }
    return updated;
  }

  public deleteTask(id: string): void {
    const success = storage.deleteTask(id);
    if (!success) {
      throw new AppError(`Task with id '${id}' not found`, 404);
    }
  }

  // ==========================================
  // RUN OF SHOW (DAY-OF TIMELINE)
  // ==========================================

  public getRunOfShow(eventId: string): RunOfShowItem[] {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.getRunOfShow(eventId);
  }

  public addRunOfShowItem(eventId: string, data: Omit<RunOfShowItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): RunOfShowItem {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.addRunOfShowItem(eventId, data);
  }

  public updateRunOfShowItem(id: string, updates: Partial<RunOfShowItem>): RunOfShowItem {
    const updated = storage.updateRunOfShowItem(id, updates);
    if (!updated) {
      throw new AppError(`Run of show item with id '${id}' not found`, 404);
    }
    return updated;
  }

  public deleteRunOfShowItem(id: string): void {
    const success = storage.deleteRunOfShowItem(id);
    if (!success) {
      throw new AppError(`Run of show item with id '${id}' not found`, 404);
    }
  }
}

export const tasksService = new TasksService();
