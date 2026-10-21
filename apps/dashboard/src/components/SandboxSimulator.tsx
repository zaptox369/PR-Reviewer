import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertTriangle, Lock, Zap, ChevronRight, RotateCcw, X } from 'lucide-react';
import { simulateReview, fetchSampleDiffs } from '../services/api.js';
import { ReviewSummary, ReviewComment } from '../types/index.js';

interface SandboxSimulatorProps {
  onReviewCreated?: (review: ReviewSummary) => void;
}

const SEV_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  critical: { text: '#9f1239', bg: '#fff1f2', border: '#fecdd3' },
  high:     { text: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  medium:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  low:      { text: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
};

function CommentCard({ c }: { c: ReviewComment }) {
  const sev = SEV_STYLES[c.severity] ?? SEV_STYLES.low;
  return (
    <div
      className="slide-up"
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${sev.border}`,
        background: sev.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-2)', flex: 1 }}>
          {c.file}:{c.line}
        </span>
        <span
          className="badge"
          style={{ background: sev.bg, color: sev.text, borderColor: sev.border, textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {c.severity}
        </span>
        <span
          className="badge"
          style={{ background: 'var(--bg-2)', color: 'var(--text-3)', borderColor: 'var(--border)', textTransform: 'capitalize' }}
        >
          {c.category}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{c.message}</div>
      {c.suggestion && (
        <pre className="code-block" style={{ marginTop: 4, fontSize: 11, color: '#86efac' }}>
          {c.suggestion.replace(/```[a-z]*\n?/gi, '').replace(/\n?```$/g, '').trim()}
        </pre>
      )}
    </div>
  );
}

export const SandboxSimulator: React.FC<SandboxSimulatorProps> = ({ onReviewCreated }) => {
  const [samples, setSamples] = useState<Record<string, { title: string; repo: string; diff: string }>>({});
  const [selectedPreset, setSelectedPreset] = useState<string>('sqliAndSecrets');
  const [repo, setRepo]         = useState('acme-corp/api-gateway');
  const [prTitle, setPrTitle]   = useState('fix(auth): add query lookup and session verification');
  const [prAuthor, setPrAuthor] = useState('developer-team');
  const [prBranch, setPrBranch] = useState('fix/auth-query');
  const [diffText, setDiffText] = useState('');
  const [loading, setLoading]   = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(true);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<ReviewSummary | null>(null);

  useEffect(() => {
    fetchSampleDiffs()
      .then((data) => {
        setSamples(data);
        if (data.sqliAndSecrets) {
          setDiffText(data.sqliAndSecrets.diff);
          setPrTitle(data.sqliAndSecrets.title);
          setRepo(data.sqliAndSecrets.repo);
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load sample diffs:', err);
        setSamplesError('Sample reviews couldn’t be loaded. You can still paste a diff below.');
      })
      .finally(() => setLoadingSamples(false));
  }, []);

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    const s = samples[key];
    if (s) { setDiffText(s.diff); setPrTitle(s.title); setRepo(s.repo); }
  };

  const handleRun = async () => {
    if (!diffText.trim()) { setError('Paste a unified git diff to continue.'); return; }
    try {
      setLoading(true); setError(null); setResult(null);
      const review = await simulateReview({ repo, prTitle, prAuthor, prBranch, diffText });
      setResult(review);
      onReviewCreated?.(review);
    } catch (e: any) {
      setError(e.message || 'Review failed. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = result
    ? result.risk === 'high' ? '#f87171'
    : result.risk === 'medium' ? '#fbbf24'
    : '#4ade80'
    : '';

  return (
    <div className="sandbox-layout" style={{ display: 'grid', gap: 16, alignItems: 'start' }}>
      {/* ── Left panel: Input ── */}
      <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
        {/* Panel header */}
        <div
          style={{
            padding: '13px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Zap size={14} color="var(--accent)" style={{ opacity: 0.9 }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Sandbox</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Preset:</span>
            {Object.keys(samples).map((key) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 5,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: selectedPreset === key ? 'rgba(36,150,237,0.4)' : 'var(--border)',
                  background: selectedPreset === key ? 'rgba(36,150,237,0.1)' : 'transparent',
                  color: selectedPreset === key ? '#0876d1' : 'var(--text-3)',
                  transition: 'all 0.12s',
                  textTransform: 'capitalize',
                }}
              >
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
            {loadingSamples && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Loading…</span>}
            {!loadingSamples && Object.keys(samples).length === 0 && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No examples available</span>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Repository
              </label>
              <input className="input-field" value={repo} onChange={e => setRepo(e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
                Author
              </label>
              <input className="input-field" value={prAuthor} onChange={e => setPrAuthor(e.target.value)} style={{ fontSize: 12 }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 5 }}>
              PR Title
            </label>
            <input className="input-field" value={prTitle} onChange={e => setPrTitle(e.target.value)} style={{ fontSize: 12 }} />
          </div>

          {/* Diff editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>Unified Diff</label>
              {diffText && (
                <button
                  onClick={() => setDiffText('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}
                >
                  <X size={11} />Clear
                </button>
              )}
            </div>
            <textarea
              className="input-field mono"
              rows={14}
              value={diffText}
              onChange={e => setDiffText(e.target.value)}
              placeholder={"diff --git a/src/auth.js b/src/auth.js\n@@ -0,0 +1,10 @@\n+const SECRET = 'hardcoded'; // paste diff here"}
              style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.6, padding: '10px 12px' }}
            />
          </div>

          {samplesError && (
            <div role="status" style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {samplesError}
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <AlertTriangle size={13} />
              {error}
            </div>
          )}

          <button className="btn-primary" onClick={handleRun} disabled={loading} style={{ alignSelf: 'flex-end', minWidth: 148 }}>
            {loading ? (
              <>
                <div
                  style={{
                    width: 13,
                    height: 13,
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Analyzing…
              </>
            ) : (
              <>
                <Play size={13} style={{ fill: 'white' }} />
                Run Review
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Right panel: Results ── */}
      <div className="surface" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '13px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Results</span>
          {result && (
            <button
              className="btn-ghost"
              onClick={() => setResult(null)}
              style={{ height: 28, padding: '0 9px', fontSize: 12 }}
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        <div style={{ padding: '16px' }}>
          {!result && !loading && (
            <div
              style={{
                minHeight: 320,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: 'var(--text-3)',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={20} color="var(--text-3)" />
              </div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
                Paste a diff and click <strong style={{ color: 'var(--text-2)' }}>Run Review</strong> to analyze it
              </div>
            </div>
          )}

          {loading && (
            <div style={{ minHeight: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer" style={{ height: 72, borderRadius: 10 }} />
              ))}
            </div>
          )}

          {result && !loading && (
            <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary header */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 10,
                  border: `1px solid ${result.risk === 'high' ? 'rgba(239,68,68,0.2)' : result.risk === 'medium' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
                  background: result.risk === 'high' ? 'rgba(239,68,68,0.05)' : result.risk === 'medium' ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={15} color={riskColor} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Review Complete</span>
                  <span className="badge" style={{ background: `${riskColor}18`, color: riskColor, borderColor: `${riskColor}35`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {result.risk} risk
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--border)' }}>
                    Score {result.score}/100
                  </span>
                  {result.secretsRedactedCount && result.secretsRedactedCount > 0 ? (
                    <span className="badge" style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.2)' }}>
                      <Lock size={10} /> {result.secretsRedactedCount} secrets masked
                    </span>
                  ) : null}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{result.summary}</p>
              </div>

              {/* Findings */}
              {result.comments.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#4ade80', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle2 size={15} />
                  No issues found — clean PR!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {result.comments.length} Finding{result.comments.length !== 1 ? 's' : ''}
                  </div>
                  {result.comments.map(c => <CommentCard key={c.id} c={c} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
