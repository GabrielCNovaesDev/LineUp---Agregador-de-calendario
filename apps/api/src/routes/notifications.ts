import { Router } from 'express';
import { db } from '../lib/db.js';
import { env } from '../config/env.js';
import { NotificationsService } from '../services/notifications.service.js';
import { EventsService } from '../services/events.service.js';
import { respondWithError } from '../middleware/error.js';

export const notificationsRouter = Router();

const notificationsService = new NotificationsService(db);
const eventsService = new EventsService(db);

notificationsRouter.get('/notifications/vapid-public-key', (_req, res) => {
  if (!env.vapidPublicKey) {
    res.status(503).json({ error: 'Push notifications not configured' });
    return;
  }
  res.json({ key: env.vapidPublicKey });
});

notificationsRouter.post('/notifications/subscribe', async (req, res) => {
  if (!notificationsService.vapidConfigured) {
    res.status(503).json({ error: 'Push notifications not configured on this server' });
    return;
  }

  const { eventId, minutesBefore, subscription } = req.body ?? {};

  if (!eventId || typeof eventId !== 'string') {
    res.status(400).json({ error: 'eventId is required (UUID string)' });
    return;
  }

  const minutes = Number(minutesBefore);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
    res.status(400).json({ error: 'minutesBefore must be an integer between 5 and 1440' });
    return;
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: 'subscription with endpoint and keys (p256dh, auth) is required' });
    return;
  }

  try {
    const event = await eventsService.findById(eventId);
    if (!event) {
      res.status(404).json({ error: 'Evento nao encontrado' });
      return;
    }

    if (new Date(event.startsAt) < new Date()) {
      res.status(422).json({ error: 'Evento ja aconteceu' });
      return;
    }

    const id = await notificationsService.subscribe({
      eventId,
      minutesBefore: minutes,
      pushEndpoint: subscription.endpoint,
      pushKeys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
    });

    res.status(201).json({ id, message: 'Inscricao realizada com sucesso' });
  } catch (error) {
    console.error('POST /api/notifications/subscribe failed:', error);
    respondWithError(res, error);
  }
});

notificationsRouter.delete('/notifications/:id', async (req, res) => {
  try {
    const deleted = await notificationsService.unsubscribe(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Inscricao nao encontrada' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error('DELETE /api/notifications/:id failed:', error);
    respondWithError(res, error);
  }
});
