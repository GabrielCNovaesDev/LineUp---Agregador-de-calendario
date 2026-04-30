import { Router } from 'express';
import { env } from '../config/env.js';
import { findJobBySportSlug, triggerJob } from '../scheduler/index.js';

export const adminRouter = Router();

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
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error(`POST /api/admin/sync/${sportSlug} failed:`, error);
    res.status(500).json({ error: message });
  }
});

function isAuthorized(authorization?: string): boolean {
  if (!env.adminSecret) return false;
  return authorization === `Bearer ${env.adminSecret}`;
}
