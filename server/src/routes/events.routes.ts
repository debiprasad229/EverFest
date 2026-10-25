import { Router } from 'express';
import { eventsController } from '../controllers/events.controller.js';
import { validateBody } from '../middleware/validate.js';
import { CreateEventSchema, UpdateEventSchema } from '../types/index.js';

const router = Router();

router.get('/', eventsController.getAll);
router.post('/', validateBody(CreateEventSchema), eventsController.create);
router.get('/:id', eventsController.getById);
router.put('/:id', validateBody(UpdateEventSchema), eventsController.update);
router.delete('/:id', eventsController.delete);
router.get('/:id/export', eventsController.exportData);

export default router;
