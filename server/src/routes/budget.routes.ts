import { Router } from 'express';
import { budgetController } from '../controllers/budget.controller.js';
import { validateBody } from '../middleware/validate.js';
import { CreateBudgetItemSchema, UpdateBudgetItemSchema } from '../types/index.js';

const router = Router();

// Routes nested under /api/v1/events/:eventId/budget
router.get('/:eventId/budget', budgetController.getByEventId);
router.post('/:eventId/budget', validateBody(CreateBudgetItemSchema), budgetController.addItem);

// Item specific operations
router.patch('/budget/items/:id', validateBody(UpdateBudgetItemSchema), budgetController.updateItem);
router.delete('/budget/items/:id', budgetController.deleteItem);

export default router;
