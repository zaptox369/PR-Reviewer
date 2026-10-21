import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, Search, RotateCcw, CheckCircle2, X, Wrench } from 'lucide-react';
import { SecurityAuditEntry } from '../types/index.js';

interface SecurityAuditViewProps {
  logs: SecurityAuditEntry[];
  loading: boolean;
  onRefresh: () => void;
  canRefresh?: boolean;
}

const SEV_CONFIG = {
  alert:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   color: '#f87171' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',  color: '#fbbf24' },
  info:    { bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.15)',  color: '#4ade80' },
};

const EVENT_LABELS: Record<string, string> = {
  hmac_failed:            'HMAC Failed',
  hmac_verified:          'HMAC OK',
  injection_detected:     'Injection Defused',
  secret_redacted:        'Secret Masked',
  line_hallucination_fixed:'Line Repaired',
  review_completed:       'Review Done',
  rate_limit_triggered:   'Rate Limited',
  feedback_recorded:      'Feedback',
  webhook_received:       'Webhook',
  github_review_posted:   'GitHub Review Posted',
  github_review_failed:   'GitHub Review Failed',
};

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ logs, loading, onRefresh, canRefresh = true }) => {
  const [sev, setSev] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      (sev === 'all' || l.severity === sev) &&
      (!q || l.details.toLowerCase().includes(q) || l.event.toLowerCase().includes(q) || (l.repo ?? '').toLowerCase().includes(q))
    );
  });

  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '13px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <ShieldCheck size={14} color="var(--text-2)" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Security Audit Log</span>
          {!loading && (
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                background: 'var(--bg-2)', color: 'var(--text-3)', border: '1px solid var(--border)',
              }}
            >
              {filtered.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={13} color="var(--text-3)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              className="input-field"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30, width: 180, fontSize: 13, height: 32, padding: '0 10px 0 30px' }}
            />
          </div>
          {(['all', 'alert', 'warning', 'info'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: '1px solid', transition: 'all 0.12s', textTransform: 'capitalize',
                borderColor: sev === s ? 'var(--border-bright)' : 'var(--border)',
                background: sev === s ? 'var(--bg-2)' : 'transparent',
                color: sev === s ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
          <button className="btn-ghost" onClick={onRefresh} disabled={!canRefresh} title={canRefresh ? 'Refresh audit log' : 'Sign in to load audit data'} style={{ height: 32, padding: '0 10px', fontSize: 12 }}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}
              >
                <div className="shimmer" style={{ width: 90, height: 22, borderRadius: 6, flexShrink: 0 }} />
                <div className="shimmer" style={{ flex: 1, height: 13, borderRadius: 4 }} />
                <div className="shimmer" style={{ width: 80, height: 11, borderRadius: 4, flexShrink: 0 }} />
              </div>
            ))
          : filtered.length === 0
          ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
              {logs.length === 0 ? 'No audit entries yet.' : 'No audit entries match your filter.'}
            </div>
          )
          : filtered.map((log) => {
              const cfg = SEV_CONFIG[log.severity] ?? SEV_CONFIG.info;
              const label = EVENT_LABELS[log.event] ?? log.event.replace(/_/g, ' ');
              return (
                <div
                  key={log.id}
                  style={{
                    padding: '11px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span
                    className="badge"
                    style={{
                      background: cfg.bg, color: cfg.color, borderColor: cfg.border,
                      flexShrink: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.details}
                    </div>
                    {log.repo && (
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {log.repo}{log.prNumber ? ` · PR #${log.prNumber}` : ''}
                      </span>
                    )}
                  </div>

                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0 }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
};
