import { storage } from '../data/storage.js';
import { BudgetItem } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class BudgetService {
  public getByEventId(eventId: string): BudgetItem[] {
    // Verify event exists
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.getBudgetItems(eventId);
  }

  public addItem(eventId: string, data: Omit<BudgetItem, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): BudgetItem {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.addBudgetItem(eventId, data);
  }

  public updateItem(id: string, updates: Partial<BudgetItem>): BudgetItem {
    const updated = storage.updateBudgetItem(id, updates);
    if (!updated) {
      throw new AppError(`Budget item with id '${id}' not found`, 404);
    }
    return updated;
  }

  public deleteItem(id: string): void {
    const success = storage.deleteBudgetItem(id);
    if (!success) {
      throw new AppError(`Budget item with id '${id}' not found`, 404);
    }
  }
}

export const budgetService = new BudgetService();
