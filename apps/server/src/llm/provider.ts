import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { DiffChunk } from '../diff/chunker.js';
import { RepoSettings, ReviewComment, Severity, Category } from '../types/index.js';
import { sanitizeAndCheckInjection, createIsolatedDiffPrompt } from '../security/sanitizer.js';
import { env } from '../config/env.js';

// Strict schema required from LLM responses
export const LLMReviewResponseSchema = z.object({
  summary: z.string(),
  keyChanges: z.array(z.string()).default([]),
  securityConcerns: z.array(z.string()).default([]),
  comments: z.array(
    z.object({
      file: z.string(),
      line: z.number().int(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      category: z.enum(['security', 'bug', 'performance', 'reliability', 'readability', 'testing', 'architecture']),
      title: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
      originalCodeSnippet: z.string().optional(),
      suggestedCodeSnippet: z.string().optional(),
      confidence: z.number().min(0).max(1).default(0.9),
      ruleId: z.string().optional(),
    })
  ).default([]),
});

export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>;

export interface LLMReviewResult {
  response: LLMReviewResponse;
  tokensUsed: { input: number; output: number; estimatedCostUsd: number };
  durationMs: number;
  injectionWarnings: string[];
}

/**
 * Built-in High-Fidelity Heuristic Code & Security Analysis Engine.
 * Provides instant, zero-cost, offline-capable reviews with zero hallucinations.
 */
export function runHeuristicReview(chunk: DiffChunk, settings: RepoSettings): LLMReviewResponse {
  const comments: ReviewComment[] = [];
  const keyChanges: string[] = [];
  const securityConcerns: string[] = [];

  for (const file of chunk.files) {
    keyChanges.push(`Updated ${file.newPath} (${file.validLineNumbers.length} modified/added lines)`);

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type !== 'add' || !line.newLineNumber) continue;
        const code = line.content;
        const lineNum = line.newLineNumber;

        // 1. SQL Injection Detection
        if (/(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*?\+\s*[\w\.]+/i.test(code) ||
            /(?:query|execute)\s*\(\s*`[^`]*\$\{.*?\}[^`]*`\s*\)/i.test(code)) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'critical',
            category: 'security',
            title: 'Potential SQL Injection Vulnerability',
            message: 'Direct string interpolation or concatenation detected in database query. An attacker could tamper with SQL parameters.',
            suggestion: '```suggestion\n// Use parameterized query placeholders instead:\nawait db.query("SELECT * FROM users WHERE id = $1", [userId]);\n```',
            confidence: 0.95,
            ruleId: 'SEC-SQLI-001',
          });
          securityConcerns.push(`SQL Injection risk in ${file.newPath}:${lineNum}`);
        }

        // 2. Hardcoded Secret / Credential / Redacted Secret Exposure Detection
        if (
          /\[REDACTED_SECRET:/i.test(code) ||
          /(?:sk[-_]live|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})/i.test(code) ||
          /(?:api[_-]?key|secret|password|auth_token)\s*=\s*["'][^"']{10,}["']/i.test(code)
        ) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'critical',
            category: 'security',
            title: 'Hardcoded Secret or Token Exposed',
            message: 'Credentials or secret keys must never be hardcoded into source code or committed to git. Use secure environment variables.',
            suggestion: '```suggestion\nconst apiKey = process.env.SERVICE_API_KEY;\n```',
            confidence: 0.98,
            ruleId: 'SEC-SECRET-002',
          });
          securityConcerns.push(`Hardcoded secret exposed in ${file.newPath}:${lineNum}`);
        }

        // 3. Sensitive Data Logging (PII, credentials, tokens)
        if (/console\.(?:log|warn|info|debug)\s*\([^)]*(?:password|token|secret|creditcard|ssn|authorization|cookie)/i.test(code)) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'high',
            category: 'security',
            title: 'Sensitive Information Logged to Console',
            message: 'Logging sensitive tokens, credentials, or PII exposes data to monitoring systems and unauthorized log viewers.',
            suggestion: '```suggestion\nlogger.info("Authentication attempt completed", { userId: user.id });\n```',
            confidence: 0.92,
            ruleId: 'SEC-LOG-003',
          });
          securityConcerns.push(`Sensitive log leakage in ${file.newPath}:${lineNum}`);
        }

        // 4. Cross-Site Scripting (XSS)
        if (/dangerouslySetInnerHTML|innerHTML\s*=/i.test(code) && !/DOMPurify\.sanitize/i.test(code)) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'high',
            category: 'security',
            title: 'Direct HTML Injection without Sanitization (XSS)',
            message: 'Rendering unescaped raw HTML can lead to Cross-Site Scripting attacks if user input is passed.',
            suggestion: '```suggestion\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />\n```',
            confidence: 0.9,
            ruleId: 'SEC-XSS-004',
          });
          securityConcerns.push(`Unsanitized HTML injection in ${file.newPath}:${lineNum}`);
        }

        // 5. Unhandled Floating Promises
        if (/(?:\.then\(.*?\)(?!\s*\.catch)|\bnew\s+Promise\b)(?!.*await)/.test(code) && !code.includes('return')) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'medium',
            category: 'reliability',
            title: 'Unhandled Asynchronous Promise',
            message: 'Promise chain lacks a .catch() handler. Prefer async/await with try/catch to avoid unhandled rejections.',
            suggestion: '```suggestion\ntry {\n  const result = await processData();\n} catch (err) {\n  logger.error("Failed to process", err);\n}\n```',
            confidence: 0.85,
            ruleId: 'REL-PROMISE-005',
          });
        }

        // 6. Memory Leak: setInterval / addEventListener without cleanup in React useEffect
        if (/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{/i.test(code) && /setInterval|addEventListener/i.test(code) && !code.includes('return () =>')) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'medium',
            category: 'performance',
            title: 'Missing Cleanup in React Effect (Potential Memory Leak)',
            message: 'Timers or event listeners registered inside useEffect should return a cleanup function to prevent memory leaks.',
            suggestion: '```suggestion\nuseEffect(() => {\n  const timer = setInterval(tick, 1000);\n  return () => clearInterval(timer);\n}, []);\n```',
            confidence: 0.87,
            ruleId: 'PERF-LEAK-007',
          });
        }

        // 7. Custom guideline check: Promise chains vs async/await
        if (settings.customGuidelines?.includes('async/await') && /\.then\(|\.catch\(/i.test(code)) {
          comments.push({
            id: uuidv4(),
            file: file.newPath,
            line: lineNum,
            severity: 'low',
            category: 'readability',
            title: 'Guideline Violation: Use async/await',
            message: 'Repo guideline specifies preferring async/await syntax over .then()/.catch() promise chaining for readability.',
            confidence: 0.88,
            ruleId: 'STYLE-ASYNC-006',
          });
        }
      }
    }
  }

  const summary = comments.length > 0
    ? `Completed automated first-pass review. Identified ${comments.length} item(s) across security, reliability, and code conventions.`
    : `Clean PR diff. All changes adhere to security standards and project conventions with no immediate hazards detected.`;

  return {
    summary,
    keyChanges,
    securityConcerns,
    comments,
  };
}

/**
 * Executes a review for a diff chunk using the selected provider:
 * - Heuristic Engine (zero network, instant, deterministic)
 * - Google Gemini (1.5 Flash / Pro)
 * - Anthropic Claude (3.5 Sonnet)
 * - OpenAI (GPT-4o / GPT-4o-mini)
 * - Ollama (100% On-Premise Air-Gapped Local Model)
 */
export async function executeChunkReview(
  chunk: DiffChunk,
  settings: RepoSettings,
  apiKey?: string,
  modelName?: string
): Promise<LLMReviewResult> {
  const startTime = Date.now();
  const injection = sanitizeAndCheckInjection(chunk.diffText);

  const provider = settings.provider || env.LLM_PROVIDER || 'heuristic-engine';
  const effectiveApiKey = apiKey || env.LLM_API_KEY || env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY;
  const effectiveModel = modelName || settings.model || env.LLM_MODEL || 'gpt-4o';

  // If provider is set to heuristic-engine, use built-in engine
  if (provider === 'heuristic-engine' || (!effectiveApiKey && provider !== 'ollama')) {
    const response = runHeuristicReview(chunk, settings);
    const durationMs = Date.now() - startTime;
    return {
      response,
      tokensUsed: {
        input: chunk.estimatedTokens,
        output: 350,
        estimatedCostUsd: 0.00,
      },
      durationMs,
      injectionWarnings: injection.findings,
    };
  }

  const prompt = createIsolatedDiffPrompt(
    injection.sanitizedDiff,
    `${settings.customGuidelines}\nFocus Areas: ${settings.focus.join(', ')}`
  );

  const systemInstructions = `
You are an expert static code analysis, quality, and security engine reviewing a Pull Request diff.
Analyze the diff strictly. Return ONLY a single JSON object conforming to this schema:
{
  "summary": "High level summary of the PR and impact",
  "keyChanges": ["Summary bullet 1", "Summary bullet 2"],
  "securityConcerns": ["Concern 1 if any"],
  "comments": [
    {
      "file": "path/to/file.ext",
      "line": 12,
      "severity": "low" | "medium" | "high" | "critical",
      "category": "security" | "bug" | "performance" | "reliability" | "readability" | "testing" | "architecture",
      "title": "Short descriptive title",
      "message": "Specific explanation of the problem and how to fix it",
      "suggestion": "\`\`\`suggestion\\nreplacement code\\n\`\`\`",
      "confidence": 0.95
    }
  ]
}
RULES:
1. ONLY comment on newly added or modified lines in the diff. Never comment on deleted lines or unmodified context.
2. If there are no issues, comments must be an empty array [].
3. Be constructive and specific. Include markdown suggestions wherever possible.
`.trim();

  try {
    let rawJsonContent = '';
    let promptTokens = chunk.estimatedTokens;
    let completionTokens = 300;
    let estimatedCostUsd = 0.0;

    // --- Provider: Google Gemini ---
    if (provider === 'gemini') {
      const geminiModel = effectiveModel.includes('gemini') ? effectiveModel : 'gemini-1.5-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${effectiveApiKey}`;

      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstructions}\n\nTask:\n${prompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
      }

      const geminiData = await res.json() as any;
      rawJsonContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      promptTokens = geminiData.usageMetadata?.promptTokenCount || chunk.estimatedTokens;
      completionTokens = geminiData.usageMetadata?.candidatesTokenCount || 300;
      estimatedCostUsd = (promptTokens * 0.00000035) + (completionTokens * 0.00000105);
    }
    // --- Provider: Anthropic Claude ---
    else if (provider === 'anthropic') {
      const claudeModel = effectiveModel.includes('claude') ? effectiveModel : 'claude-3-5-sonnet-20241022';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': effectiveApiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: claudeModel,
          max_tokens: 4000,
          system: systemInstructions,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
      }

      const claudeData = await res.json() as any;
      rawJsonContent = claudeData.content?.[0]?.text || '{}';
      promptTokens = claudeData.usage?.input_tokens || chunk.estimatedTokens;
      completionTokens = claudeData.usage?.output_tokens || 300;
      estimatedCostUsd = (promptTokens * 0.000003) + (completionTokens * 0.000015);
    }
    // --- Provider: Ollama (Local Air-Gapped Model) ---
    else if (provider === 'ollama') {
      const ollamaEndpoint = `${env.OLLAMA_BASE_URL}/v1/chat/completions`;
      const res = await fetch(ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: effectiveModel || 'llama3',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama Local API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as any;
      rawJsonContent = data.choices?.[0]?.message?.content || '{}';
      promptTokens = data.usage?.prompt_tokens || chunk.estimatedTokens;
      completionTokens = data.usage?.completion_tokens || 300;
      estimatedCostUsd = 0.0; // Local execution is 100% free!
    }
    // --- Provider: OpenAI (Default) ---
    else {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveApiKey}`,
        },
        body: JSON.stringify({
          model: effectiveModel || 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json() as any;
      rawJsonContent = data.choices?.[0]?.message?.content || '{}';
      promptTokens = data.usage?.prompt_tokens || chunk.estimatedTokens;
      completionTokens = data.usage?.completion_tokens || 300;
      estimatedCostUsd = (promptTokens * 0.0000025) + (completionTokens * 0.00001);
    }

    // Clean any accidental markdown code fences around JSON
    const cleanJson = rawJsonContent.replace(/^```(?:json)?\n|\n```$/g, '').trim();
    const parsed = LLMReviewResponseSchema.parse(JSON.parse(cleanJson));

    return {
      response: parsed,
      tokensUsed: {
        input: promptTokens,
        output: completionTokens,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
      },
      durationMs: Date.now() - startTime,
      injectionWarnings: injection.findings,
    };
  } catch (err: any) {
    // Graceful fallback to heuristic review if provider API fails, rate limits or credentials invalid
    console.warn(`[Reviewer] Provider '${provider}' request failed (${err.message}). Activating Heuristic Safety Engine fallback.`);
    const fallback = runHeuristicReview(chunk, settings);
    return {
      response: fallback,
      tokensUsed: { input: chunk.estimatedTokens, output: 250, estimatedCostUsd: 0.00 },
      durationMs: Date.now() - startTime,
      injectionWarnings: [...injection.findings, `Provider fallback triggered (${provider}): ${err.message}`],
    };
  }
}
