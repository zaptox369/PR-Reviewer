import { describe, it, expect } from 'vitest';
import express from 'express';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { authRouter, requireSession } from '../src/routes/auth.js';
import { reviewRouter } from '../src/routes/reviews.js';
import { repoRouter } from '../src/routes/repos.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/reviews', requireSession, reviewRouter);
app.use('/api/repos', requireSession, repoRouter);

interface TestResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  text: string;
}

async function dispatchRequest(options: {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = options.method || 'GET';
    req.url = options.url;
    req.headers = {
      host: 'localhost:3001',
      ...(options.headers || {}),
    };

    const rawBody =
      options.body !== undefined
        ? typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body)
        : '';

    if (rawBody) {
      req.headers['content-type'] = req.headers['content-type'] || 'application/json';
      req.headers['content-length'] = String(Buffer.byteLength(rawBody));
    }

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];

    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return origWrite(chunk, ...args);
    }) as any;

    res.end = ((chunk: any, ...args: any[]) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      origEnd(chunk, ...args);
      const text = Buffer.concat(chunks).toString('utf8');
      let parsedBody: any = text;
      try {
        parsedBody = text ? JSON.parse(text) : null;
      } catch {
        // non-JSON response
      }
      resolve({
        status: res.statusCode,
        headers: res.getHeaders() as Record<string, string | string[] | undefined>,
        body: parsedBody,
        text,
      });
      return res;
    }) as any;

    (app as any).handle(req, res, (err: unknown) => {
      if (err) reject(err);
    });

    if (rawBody) {
      req.push(rawBody);
    }
    req.push(null);
  });
}

describe('Authentication, Multi-Provider Login, Session & API Edge-Case Tests', () => {
  it('returns workspace-operator session by default when OAuth is not configured', async () => {
    const res = await dispatchRequest({ url: '/api/auth/status' });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe('workspace-operator');
    expect(res.body.providers).toMatchObject({
      email: true,
      token: true,
      sso: true,
    });
  });

  it('rejects invalid email addresses on POST /api/auth/login with 400', async () => {
    for (const invalidEmail of ['', '   ', 'not-an-email', 'missing-domain@', '@missing-local.com']) {
      const res = await dispatchRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: invalidEmail, password: 'validPassword123', provider: 'email' },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid email/i);
    }
  });

  it('rejects short or whitespace-only passwords for email sign-in with 400', async () => {
    for (const badPassword of ['', '123', '     ']) {
      const res = await dispatchRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'dev@acme.com', password: badPassword, provider: 'email' },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 4 characters/i);
    }
  });

  it('signs in with valid Email & Password, sets session cookie, and persists across /api/auth/status', async () => {
    const loginRes = await dispatchRequest({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: 'Alice.Sec@Acme.io',
        password: 'strong-password',
        name: 'alice-sec',
        provider: 'email',
      },
    });
    expect(loginRes.status).toBe(200);
    const rawCookies = loginRes.headers['set-cookie'];
    const cookieList = Array.isArray(rawCookies) ? rawCookies : [String(rawCookies || '')];
    const sessionCookieLine = cookieList.find((c) => c.startsWith('revai_session='));
    expect(sessionCookieLine).toBeDefined();

    expect(loginRes.body.configured).toBe(true);
    expect(loginRes.body.providers).toBeDefined();
    expect(loginRes.body.user).toMatchObject({
      login: 'alice-sec',
      email: 'alice.sec@acme.io',
      provider: 'email',
    });

    // Verify session cookie on /api/auth/status
    const sessionCookiePair = sessionCookieLine!.split(';')[0];
    const statusRes = await dispatchRequest({
      url: '/api/auth/status',
      headers: { cookie: sessionCookiePair },
    });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.user).toMatchObject({
      login: 'alice-sec',
      email: 'alice.sec@acme.io',
      provider: 'email',
    });
  });

  it('supports Enterprise SSO and 1-Click Reviewer Persona sign-in without password', async () => {
    for (const persona of [
      { email: 'sec-hawk@revai.dev', name: 'sec-hawk-lead', provider: 'github' },
      { email: 'arch-purist@revai.dev', name: 'principal-arch', provider: 'gitlab' },
      { email: 'sre-oncall@revai.dev', name: 'staff-sre', provider: 'sso' },
    ] as const) {
      const res = await dispatchRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: persona,
      });
      expect(res.status).toBe(200);
      expect(res.body.user.login).toBe(persona.name);
      expect(res.body.user.provider).toBe(persona.provider);
      expect(res.body.providers).toBeDefined();
    }
  });

  it('rejects short or space-containing tokens on POST /api/auth/token with 400', async () => {
    for (const invalidToken of ['', 'short', '        ', 'token with spaces 12345']) {
      const res = await dispatchRequest({
        method: 'POST',
        url: '/api/auth/token',
        body: { token: invalidToken, provider: 'github' },
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Personal Access Token|API Key/i);
    }
  });

  it('authenticates valid Personal Access Tokens and API Keys across providers', async () => {
    for (const item of [
      { token: 'revai_live_9876543210abcdef', provider: 'token' },
      { token: 'glpat-abcdef1234567890', provider: 'gitlab' },
    ] as const) {
      const res = await dispatchRequest({
        method: 'POST',
        url: '/api/auth/token',
        body: item,
      });
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.user.provider).toBe(item.provider);
      expect(String(res.headers['set-cookie'])).toContain('revai_session=');
    }
  });

  it('handles OAuth callback errors (cancelled & invalid_state) safely via redirect', async () => {
    for (const provider of ['google', 'github', 'gitlab']) {
      const cancelledRes = await dispatchRequest({
        url: `/api/auth/${provider}/callback?error=access_denied`,
      });
      expect(cancelledRes.status).toBe(302);
      expect(String(cancelledRes.headers.location)).toContain('auth_error=cancelled');

      const invalidStateRes = await dispatchRequest({
        url: `/api/auth/${provider}/callback?code=abc&state=tampered`,
      });
      expect(invalidStateRes.status).toBe(302);
      expect(String(invalidStateRes.headers.location)).toContain('auth_error=invalid_state');
    }
  });

  it('enforces explicit sign-out across protected routes while keeping public sample diffs accessible', async () => {
    const logoutRes = await dispatchRequest({ method: 'POST', url: '/api/auth/logout' });
    expect(logoutRes.status).toBe(204);
    expect(String(logoutRes.headers['set-cookie'])).toContain('revai_signed_out=1');

    // Status should report user: null when revai_signed_out=1 cookie is sent
    const statusRes = await dispatchRequest({
      url: '/api/auth/status',
      headers: { cookie: 'revai_signed_out=1' },
    });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.user).toBeNull();

    // Protected route should return 401 when explicitly signed out
    const reviewsRes = await dispatchRequest({
      url: '/api/reviews',
      headers: { cookie: 'revai_signed_out=1' },
    });
    expect(reviewsRes.status).toBe(401);

    // Public sandbox sample presets should still return 200 even when signed out
    const samplesRes = await dispatchRequest({
      url: '/api/reviews/samples',
      headers: { cookie: 'revai_signed_out=1' },
    });
    expect(samplesRes.status).toBe(200);
  });

  it('validates simulator payload and repository settings update errors cleanly', async () => {
    // Short diff (< 10 chars) should return 400
    const badSimRes = await dispatchRequest({
      method: 'POST',
      url: '/api/reviews/simulate',
      body: { diffText: 'short' },
    });
    expect(badSimRes.status).toBe(400);

    // Invalid repository ID should return 404
    const missingRepoRes = await dispatchRequest({
      method: 'PUT',
      url: '/api/repos/non-existent-repo/settings',
      body: { maxComments: 10 },
    });
    expect(missingRepoRes.status).toBe(404);
  });
});
