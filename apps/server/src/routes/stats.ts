import { Router, Request, Response } from 'express';
import { db } from '../db/store.js';

export const statsRouter = Router();

statsRouter.get('/', (_req: Request, res: Response) => {
  const stats = db.getStats();
  res.json(stats);
});
