import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { webhookRouter } from './routes/webhooks.js';
import { reviewRouter } from './routes/reviews.js';
import { repoRouter } from './routes/repos.js';
import { statsRouter } from './routes/stats.js';
import { auditRouter } from './routes/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible dashboard assets
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Policy
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback
      }
    },
    credentials: true,
  })
);

// 3. Rate Limiting Protection (Anti-DDoS / Brute Force)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again shortly.' },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Webhook rate limit exceeded.' },
});

app.use('/api', generalLimiter);
app.use('/api/webhooks', webhookLimiter);

// 4. Raw Body Buffer Capture for HMAC Signature Verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
    limit: '15mb',
  })
);
app.use(express.urlencoded({ extended: true }));

// 5. API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-pr-reviewer-server',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/integrations/github', (_req, res) => {
  res.json({
    appConfigured: Boolean(env.GITHUB_APP_ID && env.GITHUB_PRIVATE_KEY),
    installationUrl: env.GITHUB_APP_SLUG
      ? `https://github.com/apps/${encodeURIComponent(env.GITHUB_APP_SLUG)}/installations/new`
      : null,
  });
});

// 6. Mount Sub-Routers
app.use('/api/webhooks', webhookRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/repos', repoRouter);
app.use('/api/stats', statsRouter);
app.use('/api/audit', auditRouter);

// 7. Serve Static Dashboard in production if dist exists
const dashboardDist = path.resolve(__dirname, '../../dashboard/dist');
if (fs.existsSync(dashboardDist)) {
  app.use(express.static(dashboardDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dashboardDist, 'index.html'));
  });
}

// 8. Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// 9. Start Server
const server = app.listen(env.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 RevAI Code Review Server running on port ${env.PORT}`);
  console.log(`🔒 HMAC Webhook Verification: ENABLED`);
  console.log(`🛡️ Data Privacy & Zero-Leak Redactor: ${env.STRICT_PRIVACY_MODE ? 'ACTIVE' : 'OFF'}`);
  console.log(`⚡ Review Engine: ${env.LLM_PROVIDER} (${env.LLM_MODEL})`);
  console.log(`📊 Health check: http://localhost:${env.PORT}/api/health`);
  console.log(`====================================================`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => console.log('HTTP server closed'));
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => console.log('HTTP server closed'));
});
