import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  Search, 
  RotateCcw, 
  CheckCircle2, 
  X, 
  Wrench,
  Key,
  ShieldAlert,
  Terminal,
  Activity
} from 'lucide-react';
import { SecurityAuditEntry } from '../types/index.js';

interface SecurityAuditViewProps {
  logs: SecurityAuditEntry[];
  loading: boolean;
  onRefresh: () => void;
  canRefresh?: boolean;
}

const EVENT_LABELS: Record<string, { label: string; icon: any }> = {
  hmac_failed: { label: 'HMAC Signature Failed', icon: ShieldAlert },
  hmac_verified: { label: 'HMAC Cryptographic Verification', icon: ShieldCheck },
  injection_detected: { label: 'Prompt Injection Defused', icon: AlertTriangle },
  secret_redacted: { label: 'Credential / Secret Sanitized', icon: Lock },
  line_hallucination_fixed: { label: 'Line Number Repaired', icon: Wrench },
  review_completed: { label: 'Automated Review Dispatched', icon: CheckCircle2 },
  rate_limit_triggered: { label: 'Rate Limiter Throttled', icon: Activity },
  feedback_recorded: { label: 'Engineer Feedback Logged', icon: CheckCircle2 },
  webhook_received: { label: 'Webhook Handshake Received', icon: Terminal },
  github_review_posted: { label: 'GitHub Review Comment Posted', icon: CheckCircle2 },
  github_review_failed: { label: 'GitHub Review Failed', icon: ShieldAlert },
  user_login: { label: 'Operator Session Authenticated', icon: Key },
  comment_resolved: { label: 'Review Finding Resolved', icon: CheckCircle2 },
  comment_reply_added: { label: 'Review Discussion Reply Added', icon: Terminal },
};

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({ 
  logs, 
  loading, 
  onRefresh, 
  canRefresh = true 
}) => {
  const [sev, setSev] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      (sev === 'all' || l.severity === sev) &&
      (!q || 
        l.details.toLowerCase().includes(q) || 
        l.event.toLowerCase().includes(q) || 
        (l.repo ?? '').toLowerCase().includes(q)
      )
    );
  });

  return (
    <div className="surface overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ultra/20 border border-ultra/40 flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="head text-base text-white">Security & Audit Log</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-ice border border-line">
                {filtered.length} events
              </span>
            </div>
            <p className="text-xs text-ice/60">
              Immutable ledger of payload verifications, prompt injection defenses, and secret scrubs
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Severity filter pills */}
          <div className="flex items-center gap-1 bg-ink/70 p-1 rounded-full border border-line">
            {(['all', 'alert', 'warning', 'info'] as const).map((s) => {
              const active = sev === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSev(s)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-all ${
                    active
                      ? 'bg-white text-ink font-bold shadow-sm'
                      : 'text-ice/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ice/50 pointer-events-none" />
            <input
              type="text"
              className="input-field pl-8 pr-7 py-1 text-xs h-8"
              placeholder="Search event, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ice/60 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Refresh */}
          {canRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-full border border-line text-ice/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh audit log"
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="divide-y divide-line">
        {loading ? (
          <div className="p-8 space-y-3">
            <div className="shimmer h-12 w-full rounded-xl" />
            <div className="shimmer h-12 w-full rounded-xl" />
            <div className="shimmer h-12 w-full rounded-xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-ice/60 text-sm">
            <ShieldCheck size={36} className="text-ice/30 mx-auto mb-3" />
            <p className="font-semibold text-white">No security events found</p>
            <p className="text-xs text-ice/50 mt-1">Audit log is clear.</p>
          </div>
        ) : (
          filtered.map((log) => {
            const isAlert = log.severity === 'alert';
            const isWarn = log.severity === 'warning';
            const ev = EVENT_LABELS[log.event] || { label: log.event, icon: ShieldCheck };
            const Icon = ev.icon;

            return (
              <div 
                key={log.id} 
                className="p-4 md:p-5 hover:bg-ink-hover/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isAlert
                      ? 'bg-ember/15 border-ember/30 text-ember'
                      : isWarn
                      ? 'bg-amber/15 border-amber/30 text-amber'
                      : 'bg-mint/15 border-mint/30 text-mint'
                  }`}>
                    <Icon size={14} />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">
                        {ev.label}
                      </span>
                      <span className={`badge uppercase text-[9px] ${
                        isAlert ? 'risk-high' : isWarn ? 'risk-medium' : 'risk-low'
                      }`}>
                        {log.severity}
                      </span>
                      {log.repo && (
                        <span className="font-mono text-xs text-ice/70 px-1.5 py-0.5 rounded bg-ink border border-line">
                          {log.repo}
                        </span>
                      )}
                    </div>
                    <p className="text-ice/85 text-xs leading-relaxed">
                      {log.details}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right self-end md:self-auto font-mono text-[11px] text-ice/50">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  <span className="text-ice/30 ml-1.5">•</span>
                  <span className="ml-1.5">{new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
