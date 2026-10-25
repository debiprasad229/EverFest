import { Request, Response, NextFunction } from 'express';
import { vendorsService } from '../services/vendors.service.js';

export class VendorsController {
  public getByEventId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vendors = vendorsService.getByEventId(req.params.eventId);
      res.json({ success: true, count: vendors.length, data: vendors });
    } catch (err) {
      next(err);
    }
  };

  public addVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vendor = vendorsService.addVendor(req.params.eventId, req.body);
      res.status(201).json({ success: true, data: vendor });
    } catch (err) {
      next(err);
    }
  };

  public updateVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = vendorsService.updateVendor(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public deleteVendor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      vendorsService.deleteVendor(req.params.id);
      res.json({ success: true, message: 'Vendor removed' });
    } catch (err) {
      next(err);
    }
  };
}

export const vendorsController = new VendorsController();
