import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, Request, Response } from 'express';
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

function cookieOptions(maxAge: number, path: string): string {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearCookie(res: Response, name: string, path: string): void {
  res.append('Set-Cookie', `${name}=; ${cookieOptions(0, path)}`);
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

authRouter.get('/status', (req: Request, res: Response) => {
  const session = verifyToken(readCookie(req, SESSION_COOKIE));
  const user = session && typeof session.sub === 'string' &&
    typeof session.login === 'string' && typeof session.avatarUrl === 'string'
    ? { id: session.sub, login: session.login, avatarUrl: session.avatarUrl }
    : null;
  res.setHeader('Cache-Control', 'no-store');
  res.json({ configured: oauthConfigured(), user });
});

authRouter.get('/github', (_req: Request, res: Response) => {
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
        '/'
      )}`
    );
    redirectToDashboard(res);
  } catch (error) {
    console.error('[Auth] GitHub sign-in failed:', error);
    redirectToDashboard(res, 'failed');
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  clearCookie(res, SESSION_COOKIE, '/');
  res.status(204).end();
});
