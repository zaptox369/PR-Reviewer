# PR-Reviewer

**RevAI is an AI-assisted pull request review dashboard and review sandbox.** It helps developers inspect review findings, try sample code diffs, and configure repository review preferences.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20Dashboard-38a9ff)](https://revai-service.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)

> **Free demo:** The hosted service runs on a free server plan and may take a little while to wake after being idle. Data saved by the demo may be lost when the server restarts. Use sample data for evaluation; don’t submit private source code or secrets to a public demo.

## Features

- **Review dashboard** — browse, search, and filter pull request reviews.
- **Interactive sandbox** — try sample diffs and see potential review findings without connecting a repository.
- **Security checks** — includes secret and personal-data redaction, prompt-injection detection, and signed webhook verification.
- **Diff-aware findings** — review comments are checked against changed lines before they are returned.
- **Repository preferences** — configure review focus, severity thresholds, and guidelines.
- **Multiple review engines** — supports a built-in heuristic engine and optional LLM providers.

## Live Demo

Visit **[revai-service.onrender.com](https://revai-service.onrender.com)** and open **Try Sandbox** to run a sample.

The demo is publicly accessible and does not require sign-in. GitHub webhook integration is not configured by default; connect your own GitHub App and server credentials to enable automated reviews for your repositories.

## How It Works

1. A pull request event is received by the API.
2. The server verifies the webhook signature.
3. The diff is checked for sensitive data and suspicious instructions.
4. The review engine evaluates the changes and validates comment locations.
5. Findings and review metrics are returned to the dashboard.

The bot is designed to provide advisory feedback. Review it yourself before making changes or merging a pull request.

## Run Locally

### Requirements

- Node.js 20 or later
- npm

### Install and start

```bash
git clone https://github.com/zaptox369/PR-Reviewer.git
cd PR-Reviewer
npm ci
npm run dev
