import { Request, Response, NextFunction } from 'express';
import { eventsService } from '../services/events.service.js';

export class EventsController {
  public getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const events = eventsService.getAll();
      res.json({ success: true, count: events.length, data: events });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const event = eventsService.getById(req.params.id);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const newEvent = eventsService.create(req.body);
      res.status(201).json({ success: true, data: newEvent });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = eventsService.update(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      eventsService.delete(req.params.id);
      res.json({ success: true, message: 'Event successfully deleted' });
    } catch (err) {
      next(err);
    }
  };

  public exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const exportPayload = eventsService.getExportData(req.params.id);
      res.json({ success: true, data: exportPayload });
    } catch (err) {
      next(err);
    }
  };
}

export const eventsController = new EventsController();
