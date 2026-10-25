import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service.js';

export class AiController {
  public generatePlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plan = await aiService.generatePlan(req.body);
      res.json({ success: true, data: plan });
    } catch (err) {
      next(err);
    }
  };

  public applyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = aiService.applyPlanToEvent(req.params.eventId, req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  };

  public generateCreativeIdeas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ideas = await aiService.generateCreativeIdeas(req.body);
      res.json({ success: true, data: ideas });
    } catch (err) {
      next(err);
    }
  };
}

export const aiController = new AiController();
