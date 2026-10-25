import { Router } from 'express';
import { vendorsController } from '../controllers/vendors.controller.js';
import { validateBody } from '../middleware/validate.js';
import { CreateVendorSchema, UpdateVendorSchema } from '../types/index.js';

const router = Router();

// Routes nested under /api/v1/events/:eventId/vendors
router.get('/:eventId/vendors', vendorsController.getByEventId);
router.post('/:eventId/vendors', validateBody(CreateVendorSchema), vendorsController.addVendor);

// Vendor specific operations
router.patch('/vendors/:id', validateBody(UpdateVendorSchema), vendorsController.updateVendor);
router.delete('/vendors/:id', vendorsController.deleteVendor);

export default router;
