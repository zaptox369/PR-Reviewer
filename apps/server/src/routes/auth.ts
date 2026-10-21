import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authRouter = Router();

const SESSION_COOKIE = 'revai_session';
const STATE_COOKIE = 'revai_oauth_state';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const STATE_MAX_AGE_SECONDS = 10 * 60;

interface GithubProfile {
  id: number;
  login: string;
  avatarUrl: string;
}

function oauthConfigured(): boolean {
  return Boolean(
    env.GITHUB_OAUTH_CLIENT_ID &&
    env.GITHUB_OAUTH_CLIENT_SECRET &&
    env.AUTH_SESSION_SECRET.length >= 32
  );
}

function googleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.AUTH_SESSION_SECRET.length >= 32);
}

function cookieOptions(maxAge: number, path: string, sameSite: 'Lax' | 'None' = 'Lax'): string {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=${path}; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure}`;
}

function clearCookie(res: Response, name: string, path: string, sameSite: 'Lax' | 'None' = 'Lax'): void {
  res.append('Set-Cookie', `${name}=; ${cookieOptions(0, path, sameSite)}`);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const pair = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!pair) return null;
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return null;
  }
}

function redirectToDashboard(res: Response, error?: string): void {
  const destination = new URL(env.DASHBOARD_URL);
  if (error) destination.searchParams.set('auth_error', error);
  res.redirect(destination.toString());
}

function verifyToken(token: string | null): JwtPayload | null {
  if (!token || !env.AUTH_SESSION_SECRET) return null;
  try {
    const payload = jwt.verify(token, env.AUTH_SESSION_SECRET);
    return typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  // The sandbox presets are public demo content; only review execution requires a session.
  if (req.method === 'GET' && req.path === '/samples') {
    next();
    return;
  }
  const session = verifyToken(readCookie(req, SESSION_COOKIE));
  if (!session || typeof session.sub !== 'string') {
    res.status(401).json({ error: 'Sign in is required.' });
    return;
  }
  next();
}

authRouter.get('/status', (req: Request, res: Response) => {
  const session = verifyToken(readCookie(req, SESSION_COOKIE));
  const user = session && typeof session.sub === 'string' &&
    typeof session.login === 'string' && typeof session.avatarUrl === 'string'
    ? { id: session.sub, login: session.login, avatarUrl: session.avatarUrl }
    : null;
  res.json({ configured: oauthConfigured() || googleOAuthConfigured(), user });
});

authRouter.get('/google', (req: Request, res: Response) => {
  if (!googleOAuthConfigured()) {
    redirectToDashboard(res, 'not_configured');
    return;
  }
  const state = randomBytes(32).toString('hex');
  const stateToken = jwt.sign({ state }, env.AUTH_SESSION_SECRET, { expiresIn: STATE_MAX_AGE_SECONDS });
  res.append('Set-Cookie', `${STATE_COOKIE}=${encodeURIComponent(stateToken)}; ${cookieOptions(STATE_MAX_AGE_SECONDS, '/api/auth/google/callback')}`);
  const callbackUrl = env.GOOGLE_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/google/callback`;
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.searchParams.set('client_id', env.GOOGLE_OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'openid email profile');
  authorizationUrl.searchParams.set('state', state);
  res.redirect(authorizationUrl.toString());
});

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const stateCookie = readCookie(req, STATE_COOKIE);
  clearCookie(res, STATE_COOKIE, '/api/auth/google/callback');
  if (req.query.error) { redirectToDashboard(res, 'cancelled'); return; }
  const statePayload = verifyToken(stateCookie);
  if (typeof req.query.code !== 'string' || typeof req.query.state !== 'string' || typeof statePayload?.state !== 'string') {
    redirectToDashboard(res, 'invalid_state'); return;
  }
  const expected = Buffer.from(statePayload.state);
  const actual = Buffer.from(req.query.state);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) { redirectToDashboard(res, 'invalid_state'); return; }
  try {
    const callbackUrl = env.GOOGLE_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ code: req.query.code, client_id: env.GOOGLE_OAUTH_CLIENT_ID, client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET, redirect_uri: callbackUrl, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Google token exchange failed.');
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const profile = await profileResponse.json() as { id?: string; email?: string; name?: string; picture?: string; verified_email?: boolean };
    if (!profileResponse.ok || !profile.id || !profile.email || profile.verified_email !== true) throw new Error('Google returned an invalid or unverified profile.');
    const sessionToken = jwt.sign({ login: profile.name || profile.email, avatarUrl: profile.picture || '' }, env.AUTH_SESSION_SECRET, { subject: `google:${profile.id}`, expiresIn: SESSION_MAX_AGE_SECONDS });
    res.append('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}; ${cookieOptions(SESSION_MAX_AGE_SECONDS, '/', env.NODE_ENV === 'production' ? 'None' : 'Lax')}`);
    redirectToDashboard(res);
  } catch (error) {
    console.error('[Auth] Google sign-in failed:', error);
    redirectToDashboard(res, 'failed');
  }
});

authRouter.get('/github', (req: Request, res: Response) => {
  if (!oauthConfigured()) {
    redirectToDashboard(res, 'not_configured');
    return;
  }

  const state = randomBytes(32).toString('hex');
  const stateToken = jwt.sign({ state }, env.AUTH_SESSION_SECRET, { expiresIn: STATE_MAX_AGE_SECONDS });
  res.append(
    'Set-Cookie',
    `${STATE_COOKIE}=${encodeURIComponent(stateToken)}; ${cookieOptions(
      STATE_MAX_AGE_SECONDS,
      '/api/auth/github/callback'
    )}`
  );

  const callbackUrl = env.GITHUB_OAUTH_CALLBACK_URL ??
    `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/github/callback`;
  const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizationUrl.searchParams.set('scope', 'read:user');
  authorizationUrl.searchParams.set('state', state);
  res.redirect(authorizationUrl.toString());
});

authRouter.get('/github/callback', async (req: Request, res: Response) => {
  const stateCookie = readCookie(req, STATE_COOKIE);
  clearCookie(res, STATE_COOKIE, '/api/auth/github/callback');

  if (req.query.error) {
    redirectToDashboard(res, 'cancelled');
    return;
  }

  const code = req.query.code;
  const returnedState = req.query.state;
  const statePayload = verifyToken(stateCookie);
  if (
    typeof code !== 'string' ||
    typeof returnedState !== 'string' ||
    typeof statePayload?.state !== 'string'
  ) {
    redirectToDashboard(res, 'invalid_state');
    return;
  }

  const expected = Buffer.from(statePayload.state);
  const actual = Buffer.from(returnedState);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    redirectToDashboard(res, 'invalid_state');
    return;
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
      }),
    });
    if (!tokenResponse.ok) throw new Error('GitHub token exchange failed.');
    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenData.access_token) throw new Error('GitHub did not return an access token.');

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenData.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!profileResponse.ok) throw new Error('Could not load the GitHub profile.');
    const profile = await profileResponse.json() as {
      id?: number;
      login?: string;
      avatar_url?: string;
    };
    if (
      !Number.isSafeInteger(profile.id) ||
      typeof profile.login !== 'string' ||
      typeof profile.avatar_url !== 'string'
    ) {
      throw new Error('GitHub returned an invalid profile.');
    }

    const user: GithubProfile = {
      id: profile.id as number,
      login: profile.login,
      avatarUrl: profile.avatar_url,
    };
    const sessionToken = jwt.sign(
      { login: user.login, avatarUrl: user.avatarUrl },
      env.AUTH_SESSION_SECRET,
      { subject: String(user.id), expiresIn: SESSION_MAX_AGE_SECONDS }
    );
    res.append(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}; ${cookieOptions(
        SESSION_MAX_AGE_SECONDS,
        '/',
        env.NODE_ENV === 'production' ? 'None' : 'Lax'
      )}`
    );
    redirectToDashboard(res);
  } catch (error) {
    console.error('[Auth] GitHub sign-in failed:', error);
    redirectToDashboard(res, 'failed');
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  clearCookie(res, SESSION_COOKIE, '/', env.NODE_ENV === 'production' ? 'None' : 'Lax');
  res.status(204).end();
});
