import { Router } from 'express';
import { adminRouter } from './admin.js';
import { eventsRouter } from './events.js';
import { healthRouter } from './health.js';
import { notificationsRouter } from './notifications.js';

export const router = Router();

router.use(healthRouter);
router.use('/api', eventsRouter);
router.use('/api', notificationsRouter);
router.use('/api', adminRouter);
