import { Router } from 'express';
import { env } from '../config/env.js';
import { db } from '../lib/db.js';
import { respondWithError } from '../middleware/error.js';
import { findJobBySportSlug, triggerJob } from '../scheduler/index.js';
import { AlertsService } from '../services/alerts.service.js';

export const adminRouter = Router();

const alertsService = new AlertsService(db);

adminRouter.post('/admin/sync/:sportSlug', async (req, res) => {
  if (!isAuthorized(req.get('authorization'))) {
    res.status(401).json({ error: 'Nao autorizado' });
    return;
  }

  const sportSlug = req.params.sportSlug;
  const job = findJobBySportSlug(sportSlug);

  if (!job) {
    res.status(404).json({ error: `Sport nao encontrado: ${sportSlug}` });
    return;
  }

  try {
    const started = await triggerJob(job);
    void started.completion.catch((error) => {
      console.error(`[admin] manual sync ${job.name} failed unexpectedly:`, error);
    });

    res.status(202).json({
      message: 'Sync iniciado',
      syncLogId: started.syncLogId
    });
  } catch (error) {
    console.error(`POST /api/admin/sync/${sportSlug} failed:`, error);
    respondWithError(res, error);
  }
});

adminRouter.get('/admin/alerts', async (req, res) => {
  if (!isAuthorized(req.get('authorization'))) {
    res.status(401).json({ error: 'Nao autorizado' });
    return;
  }

  const includeResolved = req.query.includeResolved === 'true';

  try {
    const alerts = includeResolved
      ? await alertsService.listAll()
      : await alertsService.listActive();
    res.json({ data: alerts });
  } catch (error) {
    console.error('GET /api/admin/alerts failed:', error);
    respondWithError(res, error);
  }
});

adminRouter.get('/admin/sync-log', async (req, res) => {
  if (!isAuthorized(req.get('authorization'))) {
    res.status(401).json({ error: 'Nao autorizado' });
    return;
  }

  const limit = parseLimit(req.query.limit);

  if (limit === null) {
    res.status(400).json({ error: 'limit must be a positive integer between 1 and 100' });
    return;
  }

  try {
    const logs = await db.query(
      `
        SELECT *
        FROM sync_log
        ORDER BY started_at DESC
        LIMIT $1
      `,
      [limit]
    );
    res.json({ data: logs.rows });
  } catch (error) {
    console.error('GET /api/admin/sync-log failed:', error);
    respondWithError(res, error);
  }
});

function isAuthorized(authorization?: string): boolean {
  if (!env.adminSecret) return false;
  return authorization === `Bearer ${env.adminSecret}`;
}

function parseLimit(value: unknown): number | null {
  if (value === undefined) return 50;
  if (typeof value !== 'string') return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return null;
  return parsed;
}
