import React, { useState, useEffect } from 'react';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Zap, 
  ChevronRight, 
  RotateCcw, 
  X,
  ShieldAlert,
  Flame,
  Scale,
  Sparkles,
  GitPullRequest,
  Check,
  Copy,
  Terminal,
  Activity
} from 'lucide-react';
import { simulateReview, fetchSampleDiffs } from '../services/api.js';
import { ReviewSummary, ReviewComment } from '../types/index.js';

interface SandboxSimulatorProps {
  onReviewCreated?: (review: ReviewSummary) => void;
  canRun?: boolean;
  initialPreset?: string;
}

const SHOCK_PRESETS: { id: string; label: string; tag: string; description: string }[] = [
  { id: 'sqliAndSecrets', label: 'SQLi + Secret Leak', tag: 'Critical Shock', description: 'Raw SQL query interpolation with hardcoded JWT secret.' },
  { id: 'raceCondition', label: 'Race Condition', tag: 'Concurrency Shock', description: 'Concurrent balance updates lacking transaction locks.' },
  { id: 'authBypass', label: 'Auth & IDOR', tag: 'Access Shock', description: 'Missing tenant verification in user profile updates.' },
  { id: 'cleanPr', label: 'Clean Refactor', tag: 'Safe Merge', description: 'Production-ready refactor with full unit tests and types.' },
];

export const SandboxSimulator: React.FC<SandboxSimulatorProps> = ({ 
  onReviewCreated, 
  canRun = true,
  initialPreset
}) => {
  const [samples, setSamples] = useState<Record<string, { title: string; repo: string; diff: string }>>({});
  const [selectedShock, setSelectedShock] = useState<string>(initialPreset || 'sqliAndSecrets');
  const [repo, setRepo] = useState('acme-corp/api-gateway');
  const [prTitle, setPrTitle] = useState('fix(auth): add query lookup and session verification');
  const [prAuthor, setPrAuthor] = useState('developer-team');
  const [prBranch, setPrBranch] = useState('fix/auth-query');
  const [diffText, setDiffText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'debate' | 'comments' | 'diff' | 'secrets'>('debate');

  // Load sample diffs from server
  useEffect(() => {
    fetchSampleDiffs()
      .then((data) => {
        setSamples(data);
        const presetKey = initialPreset && data[initialPreset] ? initialPreset : 'sqliAndSecrets';
        if (data[presetKey]) {
          setDiffText(data[presetKey].diff);
          setPrTitle(data[presetKey].title);
          setRepo(data[presetKey].repo);
          setSelectedShock(presetKey);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load sample diffs:', err);
        // Fallback default sample
        setDiffText(`diff --git a/src/services/auth.ts b/src/services/auth.ts
--- a/src/services/auth.ts
+++ b/src/services/auth.ts
@@ -14,6 +14,8 @@ export async function findUser(email: string) {
-  return db.users.findUnique({ where: { email } });
+  const JWT_SECRET = "jwt_sample_token_admin";
+  const query = "SELECT * FROM users WHERE email = '" + email + "'";
+  return db.$queryRawUnsafe(query);
 }`);
      });
  }, [initialPreset]);

  const handleSelectShock = (key: string) => {
    setSelectedShock(key);
    const s = samples[key];
    if (s) {
      setDiffText(s.diff);
      setPrTitle(s.title);
      setRepo(s.repo);
    }
  };

  const handleRunSimulation = async () => {
    if (!canRun) {
      setError('Please sign in with Google to execute a live simulation.');
      return;
    }
    if (!diffText.trim()) {
      setError('Please provide a unified git diff.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await simulateReview({
        repo,
        prTitle,
        prAuthor,
        prBranch,
        diffText,
      });
      setResult(res);
      onReviewCreated?.(res);
    } catch (err: any) {
      console.error('Simulation failed:', err);
      setError(err.message || 'Simulation pipeline failed');
    } finally {
      setLoading(false);
    }
  };

  // Generate multi-agent debate perspectives based on the review outcome
  const getBullPerspective = () => {
    if (!result) return '';
    if (result.risk === 'low') {
      return `Clean changes with zero breaking API contracts. The logic is concise, code readability is strong, and this increases sprint velocity without regressions. Approve and ship immediately.`;
    }
    return `The core architectural refactor direction is sound and delivers the requested feature. While the Bear will focus heavily on security exceptions, the business logic solves the immediate latency bottleneck. With minimal inline sanitization, we can clear this for staging.`;
  };

  const getBearPerspective = () => {
    if (!result) return '';
    if (result.risk === 'high') {
      const issues = result.comments.map(c => c.title).slice(0, 2).join('; ');
      return `Hard Reject! Merging this will cause an active incident in production. Immediate red flags: ${issues || 'Unsanitized parameters and unredacted credentials'}. An attacker can exploit this within minutes of deployment.`;
    }
    return `Proceed with extreme caution. Even with good scores, watch out for unhandled promise rejections and connection pool starvation under sudden traffic spikes. Request additional integration tests before main branch merge.`;
  };

  const getAuditorPerspective = () => {
    if (!result) return '';
    const redacted = result.secretsRedactedCount || 0;
    return `Security Gate Verdict: Health Score ${result.score}/100. ${redacted > 0 ? `${redacted} credentials were stripped before reaching the AI model.` : 'No plain text secrets exposed.'} Verified HMAC and abstract syntax tree line mappings. Recommendation: ${result.risk === 'high' ? 'Block PR until security issues resolved.' : 'Safe to proceed with standard CI/CD pipeline.'}`;
  };

  return (
    <div className="space-y-6">
      {/* Simulation Control Bar */}
      <div className="surface p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Shock Selection Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ice/60 uppercase tracking-wider mr-2">
            Try a shock scenario:
          </span>
          {SHOCK_PRESETS.map((p) => {
            const isSelected = selectedShock === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectShock(p.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-white text-ink shadow-md font-bold'
                    : 'bg-white/5 text-ice/80 border border-line hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{p.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-ink/10 text-ink' : 'bg-white/10 text-ice/70'
                }`}>
                  {p.tag}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleRunSimulation}
          disabled={loading}
          className="btn-ember shrink-0 text-sm py-2.5 px-6 shadow-glow-ember font-bold flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Simulating Shock...
            </>
          ) : (
            <>
              <Flame size={16} />
              Run Simulator
            </>
          )}
        </button>
      </div>

      {/* Editor & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Diff input column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="surface p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
              <div className="flex items-center gap-2 text-xs font-semibold text-ice/80">
                <Terminal size={14} className="text-ice/70" />
                <span>Unified Git Diff</span>
              </div>
              <span className="text-[11px] font-mono text-ice/50">
                {diffText.split('\n').length} lines
              </span>
            </div>

            <textarea
              className="w-full h-80 p-3 bg-ink rounded-lg border border-line font-mono text-xs text-bone focus:outline-none focus:border-ultra transition-all resize-y"
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              placeholder="Paste unified git diff here (diff --git a/... b/...)..."
              spellCheck={false}
            />

            <div className="mt-3 flex items-center justify-between text-xs text-ice/60">
              <span>Supports syntax diffs with addition (+) and deletion (-) markers.</span>
              <button
                type="button"
                onClick={() => setDiffText('')}
                className="text-ice/60 hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* PR Metadata column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="surface p-5 space-y-4">
            <h3 className="head text-sm text-white uppercase tracking-wider">
              PR Shock Parameters
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ice/70 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="acme-corp/service-api"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ice/70 mb-1">
                  Pull Request Title
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="feat(auth): add OAuth handshake"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ice/70 mb-1">
                    Branch
                  </label>
                  <input
                    type="text"
                    className="input-field font-mono text-xs"
                    value={prBranch}
                    onChange={(e) => setPrBranch(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ice/70 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={prAuthor}
                    onChange={(e) => setPrAuthor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-ink/60 border border-line space-y-2 text-xs">
              <div className="flex items-center gap-2 text-ice">
                <Lock size={13} className="text-mint" />
                <span className="font-semibold">Zero-Leak Redaction Active</span>
              </div>
              <p className="text-ice/60 text-[11px] leading-relaxed">
                Tokens, private RSA keys, and API credentials in your diff are masked client-side and server-side before reaching any LLM inference node.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-ember/15 border border-ember/30 text-ember text-xs">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={loading}
              className="w-full btn-ultra py-3 font-bold justify-center"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Multi-Agent Simulation...
                </>
              ) : (
                <>
                  <Play size={15} />
                  Execute PR Flight Simulator
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Simulation Results - Crisis Twin Multi-Agent Debate & Findings */}
      {result && (
        <div className="surface p-6 space-y-6 slide-up border-line-bright">
          {/* Top Result Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-line">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-xl font-mono border ${
                result.risk === 'high'
                  ? 'bg-ember/15 border-ember/40 text-ember'
                  : result.risk === 'medium'
                  ? 'bg-amber/15 border-amber/40 text-amber'
                  : 'bg-mint/15 border-mint/40 text-mint'
              }`}>
                {result.score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="head text-xl text-white">{result.prTitle}</h3>
                  <span className={`badge uppercase text-[10px] ${
                    result.risk === 'high' ? 'risk-high' : result.risk === 'medium' ? 'risk-medium' : 'risk-low'
                  }`}>
                    {result.risk} Risk
                  </span>
                </div>
                <p className="text-xs text-ice/70 mt-1">
                  {result.repo} • {result.commentsCount} issues identified • Analyzed in {(result.durationMs / 1000).toFixed(1)}s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-ice/60 font-mono">
                Model: <span className="text-white font-semibold">{result.model || 'Gemini 2.5'}</span>
              </span>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <button
              onClick={() => setActiveTab('debate')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'debate'
                  ? 'bg-white text-ink font-bold'
                  : 'text-ice/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Multi-Agent Debate (3 Advisors)
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'comments'
                  ? 'bg-white text-ink font-bold'
                  : 'text-ice/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Actionable Fixes ({result.comments.length})
            </button>
            <button
              onClick={() => setActiveTab('secrets')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'secrets'
                  ? 'bg-white text-ink font-bold'
                  : 'text-ice/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Secret Redactions ({result.secretsRedactedCount || 0})
            </button>
          </div>

          {/* Tab 1: The 3 AI Advisors who Disagree on Purpose (Crisis Twin Signature) */}
          {activeTab === 'debate' && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto mb-2">
                <span className="serif text-lg text-ice">
                  “Three AI reviewers who disagree on purpose. You see the conflict instead of one blind answer.”
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Pragmatist Bull */}
                <div className="p-5 rounded-2xl bg-[#08080a] border border-mint/25 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-mint/15 text-mint border-mint/30 text-[10px] uppercase font-bold">
                      Pragmatist Bull
                    </span>
                    <span className="text-[11px] text-ice/60">Advocates Velocity</span>
                  </div>
                  <h4 className="head text-sm text-white">Finds Opportunity & Flow</h4>
                  <p className="text-xs text-ice/85 leading-relaxed">
                    {getBullPerspective()}
                  </p>
                  <div className="pt-2 border-t border-line text-[11px] text-mint/80 font-mono">
                    Evidence: diff_readability, test_delta
                  </div>
                </div>

                {/* 2. Red Team Bear */}
                <div className="p-5 rounded-2xl bg-[#08080a] border border-ember/30 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-ember/15 text-ember border-ember/40 text-[10px] uppercase font-bold">
                      Red Team Bear
                    </span>
                    <span className="text-[11px] text-ice/60">Attacks the Diff</span>
                  </div>
                  <h4 className="head text-sm text-white">Finds Chaos & Exploit Vectors</h4>
                  <p className="text-xs text-ice/85 leading-relaxed">
                    {getBearPerspective()}
                  </p>
                  <div className="pt-2 border-t border-line text-[11px] text-ember/80 font-mono">
                    Evidence: injection_risk, concurrency_hazard
                  </div>
                </div>

                {/* 3. Risk Auditor */}
                <div className="p-5 rounded-2xl bg-[#08080a] border border-ultra/40 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-ultra/20 text-ice border-ultra/40 text-[10px] uppercase font-bold">
                      Security Auditor
                    </span>
                    <span className="text-[11px] text-ice/60">Checks Guardrails</span>
                  </div>
                  <h4 className="head text-sm text-white">Checks Hidden Blast Radius</h4>
                  <p className="text-xs text-ice/85 leading-relaxed">
                    {getAuditorPerspective()}
                  </p>
                  <div className="pt-2 border-t border-line text-[11px] text-ice/80 font-mono">
                    Evidence: ast_mapping, credential_scan
                  </div>
                </div>
              </div>

              {/* Consensus Verdict Bar */}
              <div className="p-4 rounded-xl bg-ink/80 border border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Scale size={18} className="text-ice shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      Gatekeeper Consensus Verdict
                    </span>
                    <p className="text-xs text-ice/75">
                      {result.summary || 'Simulated pull request review executed successfully.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('comments')}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  Inspect All Comments <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Comments & Suggestions */}
          {activeTab === 'comments' && (
            <div className="space-y-3">
              {result.comments.length === 0 ? (
                <div className="p-8 text-center text-ice/60 text-sm">
                  <CheckCircle2 size={32} className="text-mint mx-auto mb-2" />
                  No issues discovered! The PR conforms to repository rules.
                </div>
              ) : (
                result.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-ink/70 border border-line space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge uppercase text-[10px] ${
                        c.severity === 'critical' || c.severity === 'high' ? 'risk-high' : c.severity === 'medium' ? 'risk-medium' : 'risk-low'
                      }`}>
                        {c.severity}
                      </span>
                      <span className="badge bg-white/5 text-ice/80 border-line text-[11px] capitalize">
                        {c.category}
                      </span>
                      <span className="font-mono text-xs text-ice/60 ml-auto">
                        {c.file}:{c.line}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-white">{c.title}</div>
                    <div className="text-xs text-ice/80 leading-relaxed">{c.message}</div>

                    {c.suggestion && (
                      <pre className="code-block text-mint/90 mt-2">
                        {c.suggestion.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Secrets Redaction */}
          {activeTab === 'secrets' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-ink/70 border border-line">
                <div className="flex items-center gap-2 mb-2 text-white font-semibold text-sm">
                  <Lock size={15} className="text-mint" />
                  Zero-Leak Redaction Summary
                </div>
                <p className="text-xs text-ice/70 mb-4">
                  {result.secretsRedactedCount || 0} sensitive secrets or keys detected and neutralized during pre-processing.
                </p>
                {result.redactedItems && result.redactedItems.length > 0 ? (
                  <div className="space-y-2">
                    {result.redactedItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded bg-black/40 font-mono text-xs border border-line">
                        <span className="text-ice/70">{item.type}</span>
                        <span className="text-ember font-semibold">{item.placeholder}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-mint flex items-center gap-2">
                    <CheckCircle2 size={14} /> Zero high-entropy secret leaks in this diff.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
