import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const defaultPublicUrl = process.env.NODE_ENV === 'production'
  ? 'https://revai-service.onrender.com'
  : 'http://localhost:5000';
const defaultAppBaseUrl = process.env.RENDER_EXTERNAL_URL ?? defaultPublicUrl;

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  GITHUB_WEBHOOK_SECRET: z.string().default('dev-webhook-secret-change-in-prod-1234567890'),
  GITHUB_APP_ID: z.string().optional().default(''),
  GITHUB_APP_SLUG: z.string().optional().default(''),
  GITHUB_PRIVATE_KEY: z.string().optional().default(''),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  AUTH_SESSION_SECRET: z.string().optional().default(''),
  APP_BASE_URL: z.string().url().default(defaultAppBaseUrl),
  GITHUB_OAUTH_CALLBACK_URL: z.string().url().optional(),
  GOOGLE_OAUTH_CALLBACK_URL: z.string().url().optional(),
  DASHBOARD_URL: z.string().url().default(defaultPublicUrl),
  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'ollama', 'heuristic-engine']).default('heuristic-engine'),
  LLM_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  LLM_MODEL: z.string().default('gpt-4o'),
  MAX_COMMENTS_PER_PR: z.coerce.number().default(20),
  MAX_DIFF_TOKENS: z.coerce.number().default(60000),
  STRICT_PRIVACY_MODE: z.coerce.boolean().default(true),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
});

export const env = envSchema.parse(process.env);

const githubAppSettings = [env.GITHUB_APP_ID, env.GITHUB_APP_SLUG, env.GITHUB_PRIVATE_KEY];
if (githubAppSettings.some(Boolean) && !githubAppSettings.every(Boolean)) {
  throw new Error('Set GITHUB_APP_ID, GITHUB_APP_SLUG, and GITHUB_PRIVATE_KEY together.');
}

if (env.NODE_ENV === 'production') {
  const placeholders = [
    'dev-webhook-secret-change-in-prod-1234567890',
    'replace_with_strong_random_secret_string_e92bf18a',
  ];
  if (!env.GITHUB_WEBHOOK_SECRET || placeholders.includes(env.GITHUB_WEBHOOK_SECRET)) {
    throw new Error('Set a unique GITHUB_WEBHOOK_SECRET before running in production.');
  }
}

const githubOAuthSettings = [env.GITHUB_OAUTH_CLIENT_ID, env.GITHUB_OAUTH_CLIENT_SECRET];
if (githubOAuthSettings.some(Boolean) && !githubOAuthSettings.every(Boolean)) {
  throw new Error('Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET together.');
}
const googleOAuthSettings = [env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET];
if (googleOAuthSettings.some(Boolean) && !googleOAuthSettings.every(Boolean)) {
  throw new Error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET together.');
}
if (googleOAuthSettings.every(Boolean) && env.AUTH_SESSION_SECRET.length < 32) {
  throw new Error('Set AUTH_SESSION_SECRET to a random value of at least 32 characters to enable Google sign-in.');
}
if (githubOAuthSettings.every(Boolean) && env.AUTH_SESSION_SECRET.length < 32) {
  throw new Error('Set AUTH_SESSION_SECRET to a random value of at least 32 characters to enable GitHub sign-in.');
}
