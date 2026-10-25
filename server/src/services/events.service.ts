import { storage } from '../data/storage.js';
import { Event, EventWithDetails } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class EventsService {
  public getAll(): Event[] {
    return storage.getAllEvents();
  }

  public getById(id: string): EventWithDetails {
    const event = storage.getEventById(id);
    if (!event) {
      throw new AppError(`Event with id '${id}' was not found`, 404);
    }
    return event;
  }

  public create(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event {
    return storage.createEvent(data);
  }

  public update(id: string, updates: Partial<Event>): Event {
    const updated = storage.updateEvent(id, updates);
    if (!updated) {
      throw new AppError(`Event with id '${id}' was not found`, 404);
    }
    return updated;
  }

  public delete(id: string): void {
    const success = storage.deleteEvent(id);
    if (!success) {
      throw new AppError(`Event with id '${id}' was not found`, 404);
    }
  }

  public getExportData(id: string) {
    const eventDetails = this.getById(id);
    return {
      exportedAt: new Date().toISOString(),
      event: eventDetails,
      summary: {
        totalBudget: eventDetails.totalBudget,
        totalActualSpent: eventDetails.metrics.totalActualCost,
        remainingBudget: eventDetails.metrics.remainingBudget,
        taskCompletionRate: `${eventDetails.metrics.tasksProgressPercent}%`,
        bookedVendorsCount: eventDetails.metrics.bookedVendorsCount,
      }
    };
  }
}

export const eventsService = new EventsService();
