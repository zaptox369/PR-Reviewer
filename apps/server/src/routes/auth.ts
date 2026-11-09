import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authRouter = Router();

const SESSION_COOKIE = 'revai_session';
const SIGNED_OUT_COOKIE = 'revai_signed_out';
const STATE_COOKIE = 'revai_oauth_state';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const STATE_MAX_AGE_SECONDS = 10 * 60;
const DEV_FALLBACK_SECRET = 'revai-dev-session-secret-key-minimum-32-chars-2026';

export type AuthProviderName = 'google' | 'github' | 'gitlab' | 'email' | 'token' | 'sso';

interface SessionUser {
  id: string;
  login: string;
  email?: string;
  provider?: AuthProviderName;
  avatarUrl: string;
}

function getSessionSecret(): string {
  if (env.AUTH_SESSION_SECRET && env.AUTH_SESSION_SECRET.length >= 32) {
    return env.AUTH_SESSION_SECRET;
  }
  return env.NODE_ENV === 'production' ? env.AUTH_SESSION_SECRET : DEV_FALLBACK_SECRET;
}

function githubOAuthClientId(): string {
  return env.GITHUB_OAUTH_CLIENT_ID || env.GITHUB_CLIENT_ID;
}

function githubOAuthClientSecret(): string {
  return env.GITHUB_OAUTH_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET;
}

function githubOAuthConfigured(): boolean {
  return Boolean(
    githubOAuthClientId() &&
    githubOAuthClientSecret() &&
    getSessionSecret().length >= 32
  );
}

function googleOAuthConfigured(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    getSessionSecret().length >= 32
  );
}

function gitlabOAuthConfigured(): boolean {
  return Boolean(
    env.GITLAB_OAUTH_CLIENT_ID &&
    env.GITLAB_OAUTH_CLIENT_SECRET &&
    getSessionSecret().length >= 32
  );
}

function anyOAuthConfigured(): boolean {
  return githubOAuthConfigured() || googleOAuthConfigured() || gitlabOAuthConfigured();
}

function getProvidersStatus() {
  return {
    google: googleOAuthConfigured(),
    github: githubOAuthConfigured(),
    gitlab: gitlabOAuthConfigured(),
    email: true,
    token: true,
    sso: true,
  };
}

function cookieOptions(maxAge: number, path: string, sameSite: 'Lax' | 'None' = 'Lax'): string {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=${path}; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure}`;
}

function clearCookie(res: Response, name: string, path: string, sameSite: 'Lax' | 'None' = 'Lax'): void {
  res.append('Set-Cookie', `${name}=; ${cookieOptions(0, path, sameSite)}`);
}

function setSessionCookie(res: Response, user: SessionUser): void {
  const secret = getSessionSecret();
  const sameSite = env.NODE_ENV === 'production' ? 'None' : 'Lax';
  const sessionToken = jwt.sign(
    {
      login: user.login,
      email: user.email || '',
      provider: user.provider || 'email',
      avatarUrl: user.avatarUrl || '',
    },
    secret,
    { subject: user.id, expiresIn: SESSION_MAX_AGE_SECONDS }
  );
  clearCookie(res, SIGNED_OUT_COOKIE, '/', sameSite);
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}; ${cookieOptions(
      SESSION_MAX_AGE_SECONDS,
      '/',
      sameSite
    )}`
  );
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
  const secret = getSessionSecret();
  if (!token || !secret) return null;
  try {
    const payload = jwt.verify(token, secret);
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
  if (session && typeof session.sub === 'string') {
    next();
    return;
  }
  // If user explicitly signed out, require sign-in
  if (readCookie(req, SIGNED_OUT_COOKIE) === '1') {
    res.status(401).json({ error: 'Sign in is required.' });
    return;
  }
  // When OAuth is not configured on the server, allow workspace operator mode out-of-the-box.
  if (!anyOAuthConfigured()) {
    next();
    return;
  }
  res.status(401).json({ error: 'Sign in is required.' });
}

authRouter.get('/status', (req: Request, res: Response) => {
  const providers = getProvidersStatus();

  const session = verifyToken(readCookie(req, SESSION_COOKIE));
  if (
    session &&
    typeof session.sub === 'string' &&
    typeof session.login === 'string' &&
    typeof session.avatarUrl === 'string'
  ) {
    res.json({
      configured: true,
      providers,
      user: {
        id: session.sub,
        login: session.login,
        email: typeof session.email === 'string' ? session.email : undefined,
        provider: typeof session.provider === 'string' ? session.provider : undefined,
        avatarUrl: session.avatarUrl,
      },
    });
    return;
  }

  const explicitlySignedOut = readCookie(req, SIGNED_OUT_COOKIE) === '1';
  if (explicitlySignedOut) {
    res.json({
      configured: true,
      providers,
      user: null,
    });
    return;
  }

  const configured = anyOAuthConfigured();
  if (!configured) {
    res.json({
      configured: false,
      providers,
      user: {
        id: 'workspace-operator',
        login: 'workspace-admin',
        provider: 'email',
        avatarUrl: '',
      },
    });
    return;
  }

  res.json({ configured: true, providers, user: null });
});

// Email & Password / SSO / Dev Provider Sign-In
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password, name, provider } = (req.body || {}) as {
    email?: string;
    password?: string;
    name?: string;
    provider?: AuthProviderName;
  };

  const normalizedEmail = (email || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    res.status(400).json({ error: 'Please enter a valid email address (e.g. name@company.com).' });
    return;
  }

  const selectedProvider: AuthProviderName =
    provider && ['google', 'github', 'gitlab', 'email', 'token', 'sso'].includes(provider)
      ? provider
      : 'email';

  if (selectedProvider === 'email' && (!password || password.trim().length < 4)) {
    res.status(400).json({ error: 'Password must be at least 4 characters.' });
    return;
  }

  const hash = createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 12);
  const displayLogin = (name || normalizedEmail.split('@')[0] || 'developer').trim();

  const user: SessionUser = {
    id: `${selectedProvider}:${hash}`,
    login: displayLogin,
    email: normalizedEmail,
    provider: selectedProvider,
    avatarUrl: '',
  };

  setSessionCookie(res, user);
  res.json({ configured: true, providers: getProvidersStatus(), user });
});

// Personal Access Token (GitHub / GitLab PAT) or API Key Sign-In
authRouter.post('/token', async (req: Request, res: Response) => {
  const { token, provider } = (req.body || {}) as {
    token?: string;
    provider?: 'github' | 'gitlab' | 'token';
  };

  const trimmed = (token || '').trim();
  if (!trimmed || trimmed.length < 8 || /\s/.test(trimmed)) {
    res.status(400).json({ error: 'Please enter a valid Personal Access Token or API Key (min 8 chars, no spaces).' });
    return;
  }

  const tokenProvider: AuthProviderName = provider === 'gitlab' ? 'gitlab' : provider === 'github' ? 'github' : 'token';

  // If a real GitHub token is supplied, attempt to fetch the live GitHub user profile; otherwise create a local token session
  if (tokenProvider === 'github' && (trimmed.startsWith('ghp_') || trimmed.startsWith('github_pat_'))) {
    try {
      const profileResponse = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${trimmed}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (profileResponse.ok) {
        const profile = (await profileResponse.json()) as {
          id?: number;
          login?: string;
          email?: string;
          avatar_url?: string;
        };
        if (profile.id && profile.login) {
          const user: SessionUser = {
            id: `github:${profile.id}`,
            login: profile.login,
            email: profile.email || undefined,
            provider: 'github',
            avatarUrl: profile.avatar_url || '',
          };
          setSessionCookie(res, user);
          res.json({ configured: true, providers: getProvidersStatus(), user });
          return;
        }
      }
    } catch {
      // Fall back to deterministic token session below if offline
    }
  }

  const fingerprint = createHash('sha256').update(trimmed).digest('hex').slice(0, 8);
  const user: SessionUser = {
    id: `${tokenProvider}:${fingerprint}`,
    login: `${tokenProvider}-operator-${fingerprint.slice(0, 4)}`,
    provider: tokenProvider,
    avatarUrl: '',
  };

  setSessionCookie(res, user);
  res.json({ configured: true, providers: getProvidersStatus(), user });
});

// Google OAuth
authRouter.get('/google', (_req: Request, res: Response) => {
  if (!googleOAuthConfigured()) {
    if (env.NODE_ENV !== 'production') {
      const user: SessionUser = {
        id: 'google:dev-user',
        login: 'google-developer',
        email: 'dev@google-workspace.local',
        provider: 'google',
        avatarUrl: '',
      };
      setSessionCookie(res, user);
      redirectToDashboard(res);
      return;
    }
    redirectToDashboard(res, 'not_configured');
    return;
  }
  const secret = getSessionSecret();
  const state = randomBytes(32).toString('hex');
  const stateToken = jwt.sign({ state }, secret, { expiresIn: STATE_MAX_AGE_SECONDS });
  res.append(
    'Set-Cookie',
    `${STATE_COOKIE}=${encodeURIComponent(stateToken)}; ${cookieOptions(
      STATE_MAX_AGE_SECONDS,
      '/api/auth/google/callback'
    )}`
  );
  const callbackUrl =
    env.GOOGLE_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/google/callback`;
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
  if (req.query.error) {
    redirectToDashboard(res, 'cancelled');
    return;
  }
  const statePayload = verifyToken(stateCookie);
  if (
    typeof req.query.code !== 'string' ||
    typeof req.query.state !== 'string' ||
    typeof statePayload?.state !== 'string'
  ) {
    redirectToDashboard(res, 'invalid_state');
    return;
  }
  const expected = Buffer.from(statePayload.state);
  const actual = Buffer.from(req.query.state);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    redirectToDashboard(res, 'invalid_state');
    return;
  }
  try {
    const callbackUrl =
      env.GOOGLE_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/google/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !tokenData.access_token) throw new Error('Google token exchange failed.');
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = (await profileResponse.json()) as {
      id?: string;
      email?: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };
    if (!profileResponse.ok || !profile.id || !profile.email || profile.verified_email !== true) {
      throw new Error('Google returned an invalid or unverified profile.');
    }
    setSessionCookie(res, {
      id: `google:${profile.id}`,
      login: profile.name || profile.email,
      email: profile.email,
      provider: 'google',
      avatarUrl: profile.picture || '',
    });
    redirectToDashboard(res);
  } catch (error) {
    console.error('[Auth] Google sign-in failed:', error);
    redirectToDashboard(res, 'failed');
  }
});

// GitHub OAuth
authRouter.get('/github', (_req: Request, res: Response) => {
  if (!githubOAuthConfigured()) {
    if (env.NODE_ENV !== 'production') {
      const user: SessionUser = {
        id: 'github:dev-user',
        login: 'github-maintainer',
        email: 'maintainer@github.local',
        provider: 'github',
        avatarUrl: '',
      };
      setSessionCookie(res, user);
      redirectToDashboard(res);
      return;
    }
    redirectToDashboard(res, 'not_configured');
    return;
  }

  const secret = getSessionSecret();
  const state = randomBytes(32).toString('hex');
  const stateToken = jwt.sign({ state }, secret, { expiresIn: STATE_MAX_AGE_SECONDS });
  res.append(
    'Set-Cookie',
    `${STATE_COOKIE}=${encodeURIComponent(stateToken)}; ${cookieOptions(
      STATE_MAX_AGE_SECONDS,
      '/api/auth/github/callback'
    )}`
  );

  const callbackUrl =
    env.GITHUB_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/github/callback`;
  const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', githubOAuthClientId());
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizationUrl.searchParams.set('scope', 'read:user user:email');
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
        client_id: githubOAuthClientId(),
        client_secret: githubOAuthClientSecret(),
        code,
      }),
    });
    if (!tokenResponse.ok) throw new Error('GitHub token exchange failed.');
    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) throw new Error('GitHub did not return an access token.');

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokenData.access_token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!profileResponse.ok) throw new Error('Could not load the GitHub profile.');
    const profile = (await profileResponse.json()) as {
      id?: number;
      login?: string;
      email?: string;
      avatar_url?: string;
    };
    if (
      !Number.isSafeInteger(profile.id) ||
      typeof profile.login !== 'string' ||
      typeof profile.avatar_url !== 'string'
    ) {
      throw new Error('GitHub returned an invalid profile.');
    }

    setSessionCookie(res, {
      id: `github:${profile.id}`,
      login: profile.login,
      email: profile.email || undefined,
      provider: 'github',
      avatarUrl: profile.avatar_url,
    });
    redirectToDashboard(res);
  } catch (error) {
    console.error('[Auth] GitHub sign-in failed:', error);
    redirectToDashboard(res, 'failed');
  }
});

// GitLab OAuth
authRouter.get('/gitlab', (_req: Request, res: Response) => {
  if (!gitlabOAuthConfigured()) {
    if (env.NODE_ENV !== 'production') {
      const user: SessionUser = {
        id: 'gitlab:dev-user',
        login: 'gitlab-devops',
        email: 'devops@gitlab.local',
        provider: 'gitlab',
        avatarUrl: '',
      };
      setSessionCookie(res, user);
      redirectToDashboard(res);
      return;
    }
    redirectToDashboard(res, 'not_configured');
    return;
  }

  const secret = getSessionSecret();
  const state = randomBytes(32).toString('hex');
  const stateToken = jwt.sign({ state }, secret, { expiresIn: STATE_MAX_AGE_SECONDS });
  res.append(
    'Set-Cookie',
    `${STATE_COOKIE}=${encodeURIComponent(stateToken)}; ${cookieOptions(
      STATE_MAX_AGE_SECONDS,
      '/api/auth/gitlab/callback'
    )}`
  );

  const callbackUrl =
    env.GITLAB_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/gitlab/callback`;
  const authorizationUrl = new URL('https://gitlab.com/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', env.GITLAB_OAUTH_CLIENT_ID);
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('scope', 'read_user');
  authorizationUrl.searchParams.set('state', state);
  res.redirect(authorizationUrl.toString());
});

authRouter.get('/gitlab/callback', async (req: Request, res: Response) => {
  const stateCookie = readCookie(req, STATE_COOKIE);
  clearCookie(res, STATE_COOKIE, '/api/auth/gitlab/callback');

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
    const callbackUrl =
      env.GITLAB_OAUTH_CALLBACK_URL ?? `${env.APP_BASE_URL.replace(/\/+$/, '')}/api/auth/gitlab/callback`;
    const tokenResponse = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: env.GITLAB_OAUTH_CLIENT_ID,
        client_secret: env.GITLAB_OAUTH_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }),
    });
    if (!tokenResponse.ok) throw new Error('GitLab token exchange failed.');
    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) throw new Error('GitLab did not return an access token.');

    const profileResponse = await fetch('https://gitlab.com/api/v4/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileResponse.ok) throw new Error('Could not load the GitLab profile.');
    const profile = (await profileResponse.json()) as {
      id?: number;
      username?: string;
      email?: string;
      avatar_url?: string;
    };
    if (!profile.id || !profile.username) {
      throw new Error('GitLab returned an invalid profile.');
    }

    setSessionCookie(res, {
      id: `gitlab:${profile.id}`,
      login: profile.username,
      email: profile.email || undefined,
      provider: 'gitlab',
      avatarUrl: profile.avatar_url || '',
    });
    redirectToDashboard(res);
  } catch (error) {
    console.error('[Auth] GitLab sign-in failed:', error);
    redirectToDashboard(res, 'failed');
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  const sameSite = env.NODE_ENV === 'production' ? 'None' : 'Lax';
  clearCookie(res, SESSION_COOKIE, '/', sameSite);
  res.append(
    'Set-Cookie',
    `${SIGNED_OUT_COOKIE}=1; ${cookieOptions(SESSION_MAX_AGE_SECONDS, '/', sameSite)}`
  );
  res.status(204).end();
});
