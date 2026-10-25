import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { validateBody } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { EventPlanRequestSchema, CreativeIdeasRequestSchema, ApplyPlanBodySchema } from '../types/index.js';

const router = Router();

// Primary endpoint required by specification: POST /api/ai/event-plan
router.post(
  '/event-plan', 
  aiRateLimiter, 
  validateBody(EventPlanRequestSchema), 
  aiController.generatePlan
);

// Personalized creative inspiration (themes, palettes, wording, activities, menu)
router.post(
  '/creative-ideas',
  aiRateLimiter,
  validateBody(CreativeIdeasRequestSchema),
  aiController.generateCreativeIdeas
);

router.post(
  '/inspiration',
  aiRateLimiter,
  validateBody(CreativeIdeasRequestSchema),
  aiController.generateCreativeIdeas
);

// Backward-compatible aliases for client callers
router.post(
  '/generate-plan', 
  aiRateLimiter, 
  validateBody(EventPlanRequestSchema), 
  aiController.generatePlan
);

router.post(
  '/plan', 
  aiRateLimiter, 
  validateBody(EventPlanRequestSchema), 
  aiController.generatePlan
);

// Apply plan to event with validation & rate protection
router.post(
  '/apply-plan/:eventId', 
  aiRateLimiter, 
  validateBody(ApplyPlanBodySchema), 
  aiController.applyPlan
);

export default router;
