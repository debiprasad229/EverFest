import { Request, Response, NextFunction } from 'express';
import { tasksService } from '../services/tasks.service.js';

export class TasksController {
  // Tasks
  public getTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tasks = tasksService.getTasks(req.params.eventId);
      res.json({ success: true, count: tasks.length, data: tasks });
    } catch (err) {
      next(err);
    }
  };

  public addTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = tasksService.addTask(req.params.eventId, req.body);
      res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  };

  public updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = tasksService.updateTask(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      tasksService.deleteTask(req.params.id);
      res.json({ success: true, message: 'Task deleted' });
    } catch (err) {
      next(err);
    }
  };

  // Run of Show
  public getRunOfShow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ros = tasksService.getRunOfShow(req.params.eventId);
      res.json({ success: true, count: ros.length, data: ros });
    } catch (err) {
      next(err);
    }
  };

  public addRunOfShowItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const item = tasksService.addRunOfShowItem(req.params.eventId, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  };

  public updateRunOfShowItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const updated = tasksService.updateRunOfShowItem(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public deleteRunOfShowItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      tasksService.deleteRunOfShowItem(req.params.id);
      res.json({ success: true, message: 'Run of show item deleted' });
    } catch (err) {
      next(err);
    }
  };
}

export const tasksController = new TasksController();
