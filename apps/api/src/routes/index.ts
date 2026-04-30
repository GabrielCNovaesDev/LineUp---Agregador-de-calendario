import { Router } from 'express';
import { eventsRouter } from './events.js';
import { healthRouter } from './health.js';

export const router = Router();

router.use(healthRouter);
router.use('/api', eventsRouter);
