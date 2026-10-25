import { Request, Response, NextFunction } from 'express';
import { budgetService } from '../services/budget.service.js';

export class BudgetController {
  public getByEventId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = budgetService.getByEventId(req.params.eventId);
      res.json({ success: true, count: items.length, data: items });
    } catch (err) {
      next(err);
    }
  };

  public addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = budgetService.addItem(req.params.eventId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  public updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = budgetService.updateItem(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public deleteItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      budgetService.deleteItem(req.params.id);
      res.json({ success: true, message: 'Budget item removed' });
    } catch (err) {
      next(err);
    }
  };
}

export const budgetController = new BudgetController();
