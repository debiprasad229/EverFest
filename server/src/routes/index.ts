import { Router } from 'express';
import eventsRoutes from './events.routes.js';
import budgetRoutes from './budget.routes.js';
import tasksRoutes from './tasks.routes.js';
import vendorsRoutes from './vendors.routes.js';
import aiRoutes from './ai.routes.js';

const apiRouter = Router();

apiRouter.use('/events', eventsRoutes);
apiRouter.use('/events', budgetRoutes);
apiRouter.use('/events', tasksRoutes);
apiRouter.use('/events', vendorsRoutes);
apiRouter.use('/ai', aiRoutes);

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'EverFest API',
    version: '1.0.0'
  });
});

export default apiRouter;
