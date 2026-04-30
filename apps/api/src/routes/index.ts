import { Router } from 'express';
import { adminRouter } from './admin.js';
import { eventsRouter } from './events.js';
import { healthRouter } from './health.js';

export const router = Router();

router.use(healthRouter);
router.use('/api', eventsRouter);
router.use('/api', adminRouter);
