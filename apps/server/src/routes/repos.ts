import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/store.js';

export const repoRouter = Router();

const updateRepoSchema = z.object({
  focus: z.array(z.enum(['security', 'bug', 'performance', 'reliability', 'readability', 'testing', 'architecture'])).optional(),
  ignorePaths: z.array(z.string()).optional(),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  maxComments: z.number().int().min(1).max(50).optional(),
  customGuidelines: z.string().optional(),
  autoReviewEnabled: z.boolean().optional(),
  postInlineComments: z.boolean().optional(),
  postSummaryComment: z.boolean().optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'ollama', 'heuristic-engine']).optional(),
  model: z.string().optional(),
  strictPrivacyMode: z.boolean().optional(),
});

// GET /api/repos - list all connected repositories
repoRouter.get('/', (_req: Request, res: Response) => {
  const repos = db.getRepos();
  res.json({ repos, count: repos.length });
});

// PUT /api/repos/:id/settings - update repo settings
repoRouter.put('/:id/settings', (req: Request, res: Response): void => {
  const repoId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const repos = db.getRepos();
  const existing = repos.find((r) => r.id === repoId || r.repo === repoId);

  if (!existing) {
    res.status(404).json({ error: 'Repository not found' });
    return;
  }

  const parseResult = updateRepoSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const updated = db.saveRepo({
    ...existing,
    ...parseResult.data,
  });

  res.json(updated);
});
