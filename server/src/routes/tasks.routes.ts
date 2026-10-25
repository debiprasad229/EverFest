import { Router } from 'express';
import { tasksController } from '../controllers/tasks.controller.js';
import { validateBody } from '../middleware/validate.js';
import { 
  CreateTaskSchema, 
  UpdateTaskSchema, 
  CreateRunOfShowSchema, 
  UpdateRunOfShowSchema 
} from '../types/index.js';

const router = Router();

// Milestone Tasks
router.get('/:eventId/tasks', tasksController.getTasks);
router.post('/:eventId/tasks', validateBody(CreateTaskSchema), tasksController.addTask);
router.patch('/tasks/:id', validateBody(UpdateTaskSchema), tasksController.updateTask);
router.delete('/tasks/:id', tasksController.deleteTask);

// Run of Show Schedule
router.get('/:eventId/run-of-show', tasksController.getRunOfShow);
router.post('/:eventId/run-of-show', validateBody(CreateRunOfShowSchema), tasksController.addRunOfShowItem);
router.patch('/run-of-show/:id', validateBody(UpdateRunOfShowSchema), tasksController.updateRunOfShowItem);
router.delete('/run-of-show/:id', tasksController.deleteRunOfShowItem);

export default router;
