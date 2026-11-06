import { ReviewSummary, RepoSettings, SecurityAuditEntry, SystemStats, CommentFeedback } from '../types/index.js';

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const normalizedApiBase = configuredApiBase?.replace(/\/+$/, '');
const API_BASE = normalizedApiBase
  ? normalizedApiBase.endsWith('/api')
    ? normalizedApiBase
    : `${normalizedApiBase}/api`
  : '/api';

export type AuthProviderName = 'google' | 'github' | 'gitlab' | 'email' | 'token' | 'sso';

export interface AuthUser {
  id: string;
  login: string;
  email?: string;
  provider?: AuthProviderName;
  avatarUrl: string;
}

export interface AuthStatus {
  configured: boolean;
  providers?: {
    google: boolean;
    github: boolean;
    gitlab: boolean;
    email: boolean;
    token: boolean;
    sso: boolean;
  };
  user: AuthUser | null;
}

export function getGoogleSignInUrl(): string {
  return `${API_BASE}/auth/google`;
}

export function getGithubSignInUrl(): string {
  return `${API_BASE}/auth/github`;
}

export function getGitlabSignInUrl(): string {
  return `${API_BASE}/auth/gitlab`;
}

export async function signInWithCredentials(payload: {
  email: string;
  password?: string;
  name?: string;
  provider?: AuthProviderName;
}): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Sign-in failed');
  }
  return res.json();
}

export async function signInWithToken(payload: {
  token: string;
  provider?: 'github' | 'gitlab' | 'token';
}): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Token sign-in failed');
  }
  return res.json();
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to check sign-in status');
  return res.json();
}

export async function signOut(): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to sign out');
}

export async function fetchGithubIntegration(): Promise<{ appConfigured: boolean; installationUrl: string | null }> {
  const res = await fetch(`${API_BASE}/integrations/github`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch GitHub integration status');
  return res.json();
}

export async function fetchReviews(params?: {
  repo?: string;
  author?: string;
  severity?: string;
  search?: string;
}): Promise<{ reviews: ReviewSummary[]; count: number }> {
  const query = new URLSearchParams();
  if (params?.repo) query.set('repo', params.repo);
  if (params?.author) query.set('author', params.author);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE}/reviews?${query.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function fetchReviewById(id: string): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/reviews/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Review not found');
  return res.json();
}

export async function rerunReview(id: string): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/reviews/${id}/rerun`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to re-run review');
  return res.json();
}

export async function submitCommentFeedback(
  reviewId: string,
  commentId: string,
  feedback: CommentFeedback
): Promise<{ success: boolean; comment: any }> {
  const res = await fetch(`${API_BASE}/reviews/${reviewId}/comments/${commentId}/feedback`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) throw new Error('Failed to submit comment feedback');
  return res.json();
}

export async function simulateReview(payload: {
  repo: string;
  prNumber?: number;
  prTitle: string;
  prAuthor: string;
  prBranch: string;
  diffText: string;
}): Promise<ReviewSummary> {
  const res = await fetch(`${API_BASE}/reviews/simulate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Review simulation failed');
  }
  return res.json();
}

export async function fetchSampleDiffs(): Promise<Record<string, { title: string; repo: string; diff: string }>> {
  const res = await fetch(`${API_BASE}/reviews/samples`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch sample diffs');
  return res.json();
}

export async function fetchRepos(): Promise<{ repos: RepoSettings[]; count: number }> {
  const res = await fetch(`${API_BASE}/repos`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch repositories');
  return res.json();
}

export async function updateRepoSettings(id: string, settings: Partial<RepoSettings>): Promise<RepoSettings> {
  const res = await fetch(`${API_BASE}/repos/${id}/settings`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update repository settings');
  return res.json();
}

export async function fetchStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/stats`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch system statistics');
  return res.json();
}

export async function fetchAuditLogs(): Promise<{ logs: SecurityAuditEntry[]; count: number }> {
  const res = await fetch(`${API_BASE}/audit`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch security audit logs');
  return res.json();
}
