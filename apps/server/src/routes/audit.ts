import { Router, Request, Response } from 'express';
import { db } from '../db/store.js';

export const auditRouter = Router();

auditRouter.get('/', (_req: Request, res: Response) => {
  const logs = db.getAuditLogs();
  res.json({ logs, count: logs.length });
});
