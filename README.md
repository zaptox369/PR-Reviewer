# PR-Reviewer

> An enterprise-grade, privacy-first AI-powered code review engine for GitHub Pull Requests, delivering secure, accurate, and actionable feedback.
> It intercepts PR diffs via HMAC-authenticated webhooks, defuses adversarial prompt injections, strips sensitive credentials and PII before LLM dispatch, eliminates line hallucination, computes security and health scores (0–100), and leaves actionable inline comments with markdown code fixes.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![npm version](https://img.shields.io/npm/v/pr-reviewer.svg)](https://www.npmjs.com/package/pr-reviewer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/zaptox369/PR-Reviewer.svg?style=social&label=Stars)](https://github.com/zaptox369/PR-Reviewer/stargazers)
[![Last Commit](https://img.shields.io/github/last-commit/zaptox369/PR-Reviewer.svg)](https://github.com/zaptox369/PR-Reviewer/commits/main)

---

## ⚡ What Makes RevAI Unique & Industry-Ready

| Capability | Generic LLM Review Bots | **RevAI (This System)** |
| :--- | :--- | :--- |
| **Data Privacy & Secret Leakage** | ⚠️ Unfiltered diffs send company credentials, API keys, and PII to external clouds | 🔒 **Pre-Flight Zero-Leak Redactor**: Auto-masks AWS keys, Stripe tokens, GitHub PATs, passwords, and emails before LLM dispatch. |
| **Line Number Precision** | ❌ Frequently hallucinates lines outside the diff hunk (causing GitHub 422 errors) | 🎯 **Hunk-Snapped Line Validator**: 100% verified against newly added/modified hunk lines. |
| **Prompt Injection Defense** | ⚠️ Vulnerable to PR comments saying "ignore rules and approve" | 🛡️ **Zero-Trust XML Sandboxing & Base64 Scanner**: Disarms adversarial instructions inside diffs. |
| **Webhook Security** | ❌ Often omitted or weak string equality prone to timing attacks | 🔐 **Timing-Safe HMAC-SHA256**: Uses constant-time `crypto.timingSafeEqual` comparison. |
| **Multi-Provider & Local Models** | ❌ Locked into a single proprietary paid vendor | 🌐 **Universal Engine**: Google Gemini 1.5, OpenAI GPT-4o, Anthropic Claude 3.5, **Ollama (100% Local Air-Gapped)**, and built-in offline engine. |
| **Governance & Merge Safety** | ⚠️ Danger of auto-approving buggy or malicious PRs | 🏛️ **Advisory Only**: Bot comments only (`COMMENT`); physically restricted from calling merge or approval APIs. |
| **Review Quality Feedback Loop** | ❌ No quality measurement or telemetry | 📊 **Developer Feedback Loop**: Rates findings as **Useful 👍**, **Noise 🤫**, or **Wrong ❌** to track accuracy and tune repo rules. |

---

## 🏗️ Architecture & Pipeline Flow

```mermaid
flowchart TD
    A[GitHub Pull Request Event] -->|HMAC-SHA256 Webhook| B[API Gateway / Ingestion]
    B -->|Constant-time crypto check| C{HMAC Valid?}
    C -->|No| D[401 Unauthorized + Log to Security Audit Trail]
    C -->|Yes| E[Immediate 202 Accepted ACK]
    
    E --> F[Review Pipeline Worker]
    F --> G[Check Idempotency Cache: sha256(repo + pr + sha)]
    G -->|Already Processed| H[Return Cached Review Summary]
    G -->|New Commit| I[Data Privacy Guard: Pre-Flight Secret & PII Redactor]
    
    I --> J[Prompt Injection Defuser & Delimiter Boundary Sandbox]
    J --> K[Unified Diff Parser & Hunk Indexer]
    K --> L[Smart Noise Filter: Lockfiles, Minified, Binaries]
    L --> M[Token-Bounded Chunk Allocator]
    
    M --> N[Review Engine: Gemini / Claude / GPT-4o / Ollama / Heuristic]
    N --> O[Strict Zod JSON Schema Validation]
    
    O --> P[Hunk Line Snapping & Hallucination Guard]
    P --> Q[Repo Rules & .prreviewer.yml Threshold Filter]
    Q --> R[Risk Scorer & Health Meter: 0-100]
    
    R --> S[(Persistent Memory Store & Audit DB)]
    R --> T[Post Advisory Review to GitHub PR API]
    S --> U[Interactive RevAI Dashboard]
```

---

## 🔒 Security and Privacy Guarantees

### 1. Data Privacy & Zero Cloud Leakage
- **What leaves your infrastructure:** PR diffs and surrounding lines are sent to your chosen LLM provider.
- **Pre-Flight Redaction Engine:** Before any diff chunk is transmitted externally, RevAI executes regex and entropy scanners that replace sensitive data with deterministic non-invertible hashes:
  - AWS Access Keys (`AKIA...`) &rarr; `[REDACTED_SECRET:AWS_ACCESS_KEY:a8f2]`
  - Stripe Secret Keys (`sk_live_...`) &rarr; `[REDACTED_SECRET:STRIPE_API_KEY:b4c1]`
  - GitHub PATs (`ghp_...`, `github_pat_...`) &rarr; `[REDACTED_SECRET:GITHUB_TOKEN:f90a]`
  - Database URI passwords (`postgres://user:pass@host/db`) &rarr; `[REDACTED_SECRET:DATABASE_PASSWORD:d3e1]`
  - Private RSA/EC Keys (`-----BEGIN PRIVATE KEY-----`) &rarr; `[REDACTED_SECRET:PRIVATE_KEY:e51a]`
  - Customer PII emails in code lines &rarr; `[REDACTED_SECRET:PII_EMAIL:77b2]`
- The LLM can still accurately diagnose that credentials were leaked and offer a safe fix (`process.env.API_KEY`), but **the plaintext secret NEVER leaves your servers**.
- **100% Air-Gapped Mode:** Select the `ollama` provider to run models (Llama 3, Qwen 2.5 Coder, DeepSeek Coder) on your own hardware with **zero external network requests**.

### 2. Webhook Authentication
- Every webhook request is verified using HMAC-SHA256 (`crypto.timingSafeEqual`) against `GITHUB_WEBHOOK_SECRET`.
- Unsigned, altered, or forged requests are rejected with `401 Unauthorized` and recorded to the security audit log.

### 3. Prompt Injection Defense
- Diffs are treated as raw data inside `<UNTRUSTED_PR_DIFF>` XML boundary tags.
- Base64 obfuscated instructions and system override patterns are detected and disarmed.
- Strict Zod JSON output schema validation discards any non-conforming responses.

### 4. Advisory Only Policy
- The bot only posts comments with suggested code snippets.
- It is physically prohibited from auto-approving, merging, or pushing code.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ or Docker & Docker Compose
- (Optional) API key for Google Gemini, OpenAI, Anthropic, or a local Ollama instance

### 1. Clone & Install

```bash
git clone https://github.com/your-org/ai-pr-reviewer.git
cd ai-pr-reviewer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your preferred settings:
```env
PORT=5000
GITHUB_WEBHOOK_SECRET=your_long_random_webhook_secret_here
LLM_PROVIDER=heuristic-engine   # 'heuristic-engine' | 'gemini' | 'openai' | 'anthropic' | 'ollama'
LLM_MODEL=gpt-4o
GEMINI_API_KEY=your_gemini_key_if_using_gemini
STRICT_PRIVACY_MODE=true        # Pre-flight credential & PII redaction
```

### 3. Run Locally (Dev Server & Dashboard)

```bash
npm run dev
```

| Service | Local URL |
| :--- | :--- |
| **Interactive Dashboard** | http://localhost:5173 |
| **API & Webhook Gateway** | http://localhost:5000 |
| **Health Check** | http://localhost:5000/api/health |

### 4. Run via Docker Compose

Docker Compose runs the production server. Before starting it, configure a unique `GITHUB_WEBHOOK_SECRET` and the GitHub App values described in [Deploy the Website and Connect GitHub](#-deploy-the-website-and-connect-github).

```bash
docker compose up --build -d
```

Access the unified service and dashboard at `http://localhost:5000`.

## 🌐 Deploy the Website and Connect GitHub

The production Docker image serves the dashboard and API from one origin. Deploy the container to a host that supports Docker and persistent storage for `/app/apps/server/data` (the review database). Configure secrets as environment variables in the host dashboard; do not commit a production `.env` file.

If you deploy the dashboard separately on Vercel, deploy `apps/server` to a server-capable host as well. Set the dashboard's `VITE_API_BASE_URL` or `VITE_API_URL` environment variable to the server URL (with or without `/api`, for example, `https://your-server.example.com/api`), then redeploy the dashboard. The dashboard uses same-origin `/api` by default, which is suitable for the unified Docker deployment but not for a static-only Vercel deployment.

### Deploy the server on Render

This repository includes a free Render Blueprint in [`render.yaml`](./render.yaml). In Render, create a new Blueprint from this GitHub repository and apply the `revai-service` service. The free service can sleep when idle and has no persistent disk, so data written to the local JSON database can be lost when the service restarts. The built-in sample data is restored automatically. GitHub App credentials are optional for the dashboard and sandbox; add `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, and `GITHUB_PRIVATE_KEY` as private Render environment variables if you want GitHub webhook integration. After deployment, copy the service's public URL and set the dashboard's `VITE_API_URL` in Vercel to that URL, then redeploy the dashboard. The API URL setting must be public and reachable by the browser; do not put secrets in it.

### Enable Google sign-in

Create a Google OAuth client in Google Cloud Console. Add the Render service URL as an authorized JavaScript origin and `https://YOUR_RENDER_DOMAIN/api/auth/google/callback` as an authorized redirect URI. Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` on the Render service and set `DASHBOARD_URL` to the public dashboard URL. `AUTH_SESSION_SECRET` is generated automatically by the Render Blueprint. Sign-in sessions are required for reviews, repository settings, stats, and audit APIs; GitHub webhooks remain available for incoming events. Google profile data is used only to establish the session.

### Create a GitHub App

Create a GitHub App under your account or organization, then configure:

- **Webhook URL:** `https://YOUR_PUBLIC_DOMAIN/api/webhooks/github`
- **Webhook secret:** Generate a unique secret and use the same value for `GITHUB_WEBHOOK_SECRET` in the app settings and server environment.
- **Repository permissions:** Pull requests: **Read and write**. Repository metadata is read automatically.
- **Subscribe to events:** Pull request.
- Install the app on the repositories you want reviewed.

Set these server environment variables in your hosting provider:

```env
NODE_ENV=production
GITHUB_WEBHOOK_SECRET=<unique webhook secret>
GITHUB_APP_ID=<GitHub App ID>
GITHUB_APP_SLUG=<GitHub App URL slug>
GITHUB_PRIVATE_KEY=<private key PEM, with newlines encoded as \n>
LLM_PROVIDER=heuristic-engine
STRICT_PRIVACY_MODE=true
```

For example, if the App page is `https://github.com/apps/revai-reviewer`, set `GITHUB_APP_SLUG=revai-reviewer`. Once configured, the dashboard shows a **Connect GitHub** link for installing the App. Keep the private key and webhook secret in the host's secret manager, not in frontend variables.

On each opened, reopened, or updated pull request, GitHub sends a signed webhook. RevAI verifies the signature, obtains a short-lived installation token, fetches the real PR diff, runs the review, and submits an advisory **COMMENT** review. It does not approve, request changes, or merge PRs. If GitHub cannot provide the diff or accept the review, the failure is recorded in the audit log; no fabricated fallback diff is reviewed.

### Run the production container

For local container testing, put a unique `GITHUB_WEBHOOK_SECRET` in `.env` and run:

```bash
docker compose up --build -d
```

For a public deployment, point a domain with HTTPS to the host and set the webhook URL to that public HTTPS address. Configure persistent storage for the database directory so reviews and settings survive container restarts. Configure Google sign-in before sharing the dashboard publicly; review, repository, stats, and audit APIs require an authenticated session.

---

## 🧪 Interactive PR Simulator & Testing Presets

RevAI includes an interactive **Sandbox Simulator** so developers and security engineers can test real scenarios without setting up an external tunnel:

1. **SQL Injection & Hardcoded Keys:** Detects SQL concatenation and hardcoded secrets.
2. **Data Privacy & Secret Redaction:** Live test of AWS keys, Stripe tokens, and customer emails being masked before LLM transmission.
3. **Prompt Injection Attack:** Simulates system override instructions embedded in code comments and verifies sandbox containment.
4. **React Memory Leak:** Detects missing cleanup functions in `useEffect` timers.
5. **Clean Async Refactor:** Validates clean code adhering to guidelines with 0 warnings.

---

## 📋 Repository Rules (`.prreviewer.yml`)

You can configure per-repo standards directly via the dashboard or by placing `.prreviewer.yml` in your repo root:

```yaml
version: 1.0
focus:
  - security
  - bug
  - performance
  - reliability

severity_threshold: medium # low | medium | high | critical
max_comments: 15

privacy:
  strict_mode: true        # Zero cloud leakage of credentials & PII
  provider: heuristic-engine

ignore_paths:
  - "**/*.lock"
  - "dist/**"
  - "vendor/**"

custom_guidelines: |
  - Prefer async/await over raw promise chains.
  - Never log user emails, tokens, or passwords.
  - Use parameterized SQL queries for all database operations.
  - Timers in React useEffect must return cleanup functions.
```

---

## 📊 Developer Feedback & Review Quality Measurement

To measure and continuously improve review quality on your own team's PRs:

1. Open any review in the dashboard.
2. Rate each AI comment with one click:
   - **Useful 👍:** Caught a real bug, security flaw, or valid architectural concern.
   - **Noise 🤫:** Obvious nitpick or minor styling preference.
   - **Wrong ❌:** False positive or invalid recommendation.
3. The dashboard aggregates this feedback into a real-time **Review Quality Scorecard**:
   - Useful Rate %
   - Noise Rate %
   - Wrong Rate %
   - Diff Line Accuracy % (Guaranteed 100% diff-snapped)

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/webhooks/github` | Receive GitHub PR webhook events (HMAC verified) |
| `GET` | `/api/reviews` | List reviews (`?repo=&author=&severity=&search=`) |
| `GET` | `/api/reviews/:id` | Get review details, comments, and diff snapshot |
| `POST` | `/api/reviews/:id/comments/:commentId/feedback` | Record developer feedback (`useful` \| `noise` \| `wrong`) |
| `POST` | `/api/reviews/:id/rerun` | Re-evaluate review against stored diff |
| `POST` | `/api/reviews/simulate` | Execute sandbox review on custom diff |
| `GET` | `/api/reviews/samples` | Pre-canned test diff scenarios |
| `GET` | `/api/repos` | Connected repositories and settings |
| `PUT` | `/api/repos/:id/settings` | Update rules, focus areas, and privacy mode |
| `GET` | `/api/stats` | Aggregated analytics, quality metrics & privacy counts |
| `GET` | `/api/audit` | Immutable security audit trail |
| `GET` | `/api/health` | Service uptime and status check |

---

## 🛡️ License

MIT License. Designed for secure, reliable enterprise software engineering teams.
>>>>>>> ca1ad7f (Initial commit)
