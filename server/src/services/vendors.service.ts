import { storage } from '../data/storage.js';
import { Vendor } from '../types/index.js';
import { AppError } from '../middleware/errorHandler.js';

export class VendorsService {
  public getByEventId(eventId: string): Vendor[] {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.getVendors(eventId);
  }

  public addVendor(eventId: string, data: Omit<Vendor, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>): Vendor {
    const event = storage.getEventById(eventId);
    if (!event) {
      throw new AppError(`Event with id '${eventId}' not found`, 404);
    }
    return storage.addVendor(eventId, data);
  }

  public updateVendor(id: string, updates: Partial<Vendor>): Vendor {
    const updated = storage.updateVendor(id, updates);
    if (!updated) {
      throw new AppError(`Vendor with id '${id}' not found`, 404);
    }
    return updated;
  }

  public deleteVendor(id: string): void {
    const success = storage.deleteVendor(id);
    if (!success) {
      throw new AppError(`Vendor with id '${id}' not found`, 404);
    }
  }
}

export const vendorsService = new VendorsService();
