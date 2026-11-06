import React, { useEffect, useState, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  GitPullRequest,
  Terminal,
  Share2,
  ShieldCheck,
  Settings,
  Flame,
  ArrowRight,
  X,
  CornerDownLeft,
  Sparkles,
  FileCode
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tab } from './Navbar.js';
import { ReviewSummary } from '../types/index.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: Tab) => void;
  onTriggerShock: (presetId: string) => void;
  onSelectReview: (review: ReviewSummary) => void;
  reviews: ReviewSummary[];
}

interface CommandItem {
  id: string;
  group: 'Navigation' | 'Quick Simulator Shocks' | 'Recent Pull Requests';
  label: string;
  sublabel: string;
  badge?: string;
  badgeColor?: 'ember' | 'mint' | 'ultra' | 'ice';
  icon: LucideIcon;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onTriggerShock,
  onSelectReview,
  reviews,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    // Navigation
    {
      id: 'nav-overview',
      group: 'Navigation',
      label: 'Go to Workspace Overview',
      sublabel: 'First page dashboard, architecture showcase & live telemetry',
      badge: 'Tab 1',
      badgeColor: 'ice',
      icon: LayoutGrid,
      action: () => { onSelectTab('overview'); onClose(); },
    },
    {
      id: 'nav-sandbox',
      group: 'Navigation',
      label: 'Open PR Flight Simulator',
      sublabel: 'Test vulnerability shocks and watch 3 AI reviewers debate live',
      badge: 'Live Sandbox',
      badgeColor: 'ember',
      icon: Terminal,
      action: () => { onSelectTab('sandbox'); onClose(); },
    },
    {
      id: 'nav-blast',
      group: 'Navigation',
      label: 'Inspect Blast Radius & Dependency Map',
      sublabel: 'Trace how diff changes propagate across services, DBs & caches',
      badge: 'Propagation',
      badgeColor: 'ultra',
      icon: Share2,
      action: () => { onSelectTab('blast'); onClose(); },
    },
    {
      id: 'nav-reviews',
      group: 'Navigation',
      label: 'Browse All Pull Request Reviews',
      sublabel: 'Search and filter automated PR reviews and inline comments',
      badge: `${reviews.length} PRs`,
      badgeColor: 'mint',
      icon: GitPullRequest,
      action: () => { onSelectTab('reviews'); onClose(); },
    },
    {
      id: 'nav-audit',
      group: 'Navigation',
      label: 'View Cryptographic Security Audit Trail',
      sublabel: 'HMAC verifications, secret redactions & prompt injection blocks',
      badge: 'Zero-Trust',
      badgeColor: 'mint',
      icon: ShieldCheck,
      action: () => { onSelectTab('audit'); onClose(); },
    },
    {
      id: 'nav-settings',
      group: 'Navigation',
      label: 'Configure Repository Guardrails (.prreviewer.yml)',
      sublabel: 'Switch AI provider (Gemini, Claude, GPT-4o, Ollama) & thresholds',
      badge: 'Settings',
      badgeColor: 'ice',
      icon: Settings,
      action: () => { onSelectTab('settings'); onClose(); },
    },

    // Quick Shocks
    {
      id: 'shock-sqli',
      group: 'Quick Simulator Shocks',
      label: 'Simulate Shock: SQL Injection + Hardcoded Secret',
      sublabel: 'Tests Pre-Flight Secret Redactor + SEC-SQLI-001 detection',
      badge: 'Critical Shock',
      badgeColor: 'ember',
      icon: Flame,
      action: () => { onTriggerShock('sqliAndSecrets'); onClose(); },
    },
    {
      id: 'shock-race',
      group: 'Quick Simulator Shocks',
      label: 'Simulate Shock: Ledger Concurrency Race Condition',
      sublabel: 'Tests non-atomic wallet balance TOCTOU double-spend detection',
      badge: 'Concurrency',
      badgeColor: 'ember',
      icon: Flame,
      action: () => { onTriggerShock('raceCondition'); onClose(); },
    },
    {
      id: 'shock-idor',
      group: 'Quick Simulator Shocks',
      label: 'Simulate Shock: Multi-Tenant Auth & IDOR Bypass',
      sublabel: 'Tests missing orgId scope detection in invoice lookup endpoint',
      badge: 'Access Control',
      badgeColor: 'ultra',
      icon: Flame,
      action: () => { onTriggerShock('authBypass'); onClose(); },
    },
    {
      id: 'shock-clean',
      group: 'Quick Simulator Shocks',
      label: 'Simulate Safe Merge: Clean Async/Await Refactor',
      sublabel: 'Verifies 100/100 health score and zero false-positive warnings',
      badge: 'Safe Merge',
      badgeColor: 'mint',
      icon: Sparkles,
      action: () => { onTriggerShock('cleanPr'); onClose(); },
    },

    // Recent PRs
    ...reviews.slice(0, 6).map((rev): CommandItem => ({
      id: `rev-${rev.id}`,
      group: 'Recent Pull Requests',
      label: `${rev.prTitle} (#${rev.prNumber})`,
      sublabel: `${rev.repo} • by ${rev.prAuthor} • Score ${rev.score}/100 (${rev.risk.toUpperCase()} risk)`,
      badge: `Score ${rev.score}`,
      badgeColor: rev.risk === 'high' ? 'ember' : rev.risk === 'medium' ? 'ice' : 'mint',
      icon: FileCode,
      action: () => { onSelectReview(rev); onClose(); },
    })),
  ];

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.sublabel.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0
        );
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  const groups: ('Navigation' | 'Quick Simulator Shocks' | 'Recent Pull Requests')[] = [
    'Navigation',
    'Quick Simulator Shocks',
    'Recent Pull Requests',
  ];

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-ink/80 backdrop-blur-md fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={onClose}
    >
      <div
        className="surface max-w-2xl w-full border-line-bright overflow-hidden shadow-card slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="p-4 border-b border-line flex items-center gap-3 bg-ink-soft">
          <Search size={18} className="text-ember shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, jump to a tool, or search pull requests..."
            className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-ice/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-ice/50 hover:text-white p-1"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="kbd text-[10px] hover:bg-white/10 transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[62vh] overflow-y-auto p-2 divide-y divide-line/40">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-ice/60 text-sm">
              No matching commands or pull requests found for "{query}".
            </div>
          ) : (
            groups.map((groupName) => {
              const groupItems = filtered.filter((i) => i.group === groupName);
              if (groupItems.length === 0) return null;

              return (
                <div key={groupName} className="py-2 first:pt-1 last:pb-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ice/45">
                    {groupName}
                  </div>
                  <div className="space-y-1">
                    {groupItems.map((item) => {
                      runningIndex++;
                      const currentIdx = runningIndex;
                      const isActive = currentIdx === selectedIndex;
                      const Icon = item.icon;

                      const badgeCls = {
                        ember: 'bg-ember/15 text-ember border-ember/30',
                        mint: 'bg-mint/15 text-mint border-mint/30',
                        ultra: 'bg-ultra/20 text-ice border-ultra/40',
                        ice: 'bg-white/10 text-ice border-line',
                      }[item.badgeColor || 'ice'];

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(currentIdx)}
                          onClick={item.action}
                          className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors ${
                            isActive ? 'bg-white/12 text-white' : 'hover:bg-white/5 text-ice/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                isActive
                                  ? 'bg-ember/20 border-ember/40 text-ember'
                                  : 'bg-white/5 border-line text-ice/70'
                              }`}
                            >
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-ice/55 truncate">
                                {item.sublabel}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeCls}`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {isActive && (
                              <CornerDownLeft size={13} className="text-ice/60" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-ink-soft border-t border-line flex items-center justify-between text-[11px] text-ice/50">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="kbd mr-1">↑</kbd>
              <kbd className="kbd mr-1">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="kbd mr-1">↵</kbd> to select
            </span>
            <span>
              <kbd className="kbd mr-1">ESC</kbd> to close
            </span>
          </div>
          <span className="font-mono hidden sm:inline">RevAI Quick Command</span>
        </div>
      </div>
    </div>
  );
};
