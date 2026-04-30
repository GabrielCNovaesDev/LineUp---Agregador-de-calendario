import { Router } from 'express';
import { db } from '../lib/db.js';
import { EventsService } from '../services/events.service.js';
import { parseListEventsQuery } from './events.parser.js';

export const eventsRouter = Router();

const eventsService = new EventsService(db);

eventsRouter.get('/events', async (req, res) => {
  const parsed = parseListEventsQuery(req.query);

  if (!parsed.ok) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.errors });
    return;
  }

  try {
    const result = await eventsService.listEvents(parsed.filter);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET /api/events failed:', error);
    res.status(500).json({ error: message });
  }
});
