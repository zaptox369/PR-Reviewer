import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  Check, 
  FileText, 
  Sliders, 
  Shield, 
  Code2, 
  AlertTriangle, 
  Lock, 
  Cpu,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { RepoSettings, Category, Severity } from '../types/index.js';
import { updateRepoSettings } from '../services/api.js';

interface RepoSettingsViewProps {
  repos: RepoSettings[];
  onRefresh: () => void;
}

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'security', label: 'Security & Vulnerabilities', icon: '🔒' },
  { id: 'bug', label: 'Logic & Runtime Bugs', icon: '🐛' },
  { id: 'performance', label: 'Performance & Latency', icon: '⚡' },
  { id: 'reliability', label: 'Reliability & Error Handling', icon: '🛡️' },
  { id: 'readability', label: 'Readability & Clean Code', icon: '📖' },
  { id: 'testing', label: 'Test Coverage & Assertions', icon: '🧪' },
  { id: 'architecture', label: 'Design & Architecture', icon: '🏛️' },
];

const PROVIDERS = [
  { id: 'gemini', name: 'Google Gemini 2.5 Flash', tag: 'Fastest' },
  { id: 'anthropic', name: 'Anthropic Claude 3.7', tag: 'Reasoning' },
  { id: 'openai', name: 'OpenAI GPT-4o', tag: 'Standard' },
  { id: 'heuristic-engine', name: 'Local Heuristic Engine', tag: 'Air-gapped' },
] as const;

export const RepoSettingsView: React.FC<RepoSettingsViewProps> = ({ repos, onRefresh }) => {
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repos[0]?.id || '');
  const currentRepo = repos.find((r) => r.id === selectedRepoId) || repos[0];

  const [focus, setFocus] = useState<Category[]>(currentRepo?.focus || []);
  const [severityThreshold, setSeverityThreshold] = useState<Severity>(currentRepo?.severityThreshold || 'medium');
  const [maxComments, setMaxComments] = useState<number>(currentRepo?.maxComments || 15);
  const [customGuidelines, setCustomGuidelines] = useState<string>(currentRepo?.customGuidelines || '');
  const [autoReview, setAutoReview] = useState<boolean>(currentRepo?.autoReviewEnabled ?? true);
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'gemini' | 'ollama' | 'heuristic-engine'>(
    currentRepo?.provider || 'gemini'
  );
  const [strictPrivacyMode, setStrictPrivacyMode] = useState<boolean>(currentRepo?.strictPrivacyMode ?? true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSelectRepo = (repoId: string) => {
    setSelectedRepoId(repoId);
    const target = repos.find((r) => r.id === repoId);
    if (target) {
      setFocus(target.focus);
      setSeverityThreshold(target.severityThreshold);
      setMaxComments(target.maxComments);
      setCustomGuidelines(target.customGuidelines);
      setAutoReview(target.autoReviewEnabled);
      setProvider(target.provider || 'gemini');
      setStrictPrivacyMode(target.strictPrivacyMode ?? true);
    }
  };

  const handleToggleCategory = (cat: Category) => {
    if (focus.includes(cat)) {
      setFocus(focus.filter((c) => c !== cat));
    } else {
      setFocus([...focus, cat]);
    }
  };

  const handleSave = async () => {
    if (!currentRepo) return;
    try {
      setSaving(true);
      setSaveError(null);
      await updateRepoSettings(currentRepo.id, {
        focus,
        severityThreshold,
        maxComments,
        customGuidelines,
        autoReviewEnabled: autoReview,
        provider,
        strictPrivacyMode,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      onRefresh();
    } catch (err: any) {
      console.error('Save failed:', err);
      setSaveError(err.message || 'Failed to persist settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="surface p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-line">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-mark" />
            Repository Policies
          </div>
          <h2 className="head text-2xl text-white">Review Guardrail Preferences</h2>
          <p className="text-xs text-ice/70 mt-1">
            Configure automated evaluation triggers, review sensitivity thresholds, and privacy guardrails.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-ultra text-xs py-2 px-5 self-start md:self-auto font-bold flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : savedSuccess ? (
            <>
              <Check size={14} className="text-mint" />
              Saved!
            </>
          ) : (
            <>
              <Save size={14} />
              Save Preferences
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="p-3 rounded-lg bg-ember/15 border border-ember/30 text-ember text-xs">
          {saveError}
        </div>
      )}

      {/* Repo Selector Pills */}
      {repos.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ice/70 uppercase tracking-wider block">
            Target Repository
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {repos.map((r) => {
              const isSelected = (currentRepo?.id || '') === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRepo(r.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono transition-all ${
                    isSelected
                      ? 'bg-white text-ink font-bold shadow-md'
                      : 'bg-ink border border-line text-ice/70 hover:text-white'
                  }`}
                >
                  {r.repo}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left Column: Focus Categories & Thresholds */}
        <div className="space-y-5">
          {/* Focus Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Review Focus Areas
              </label>
              <span className="text-xs text-ice/50 font-mono">
                {focus.length} active
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {CATEGORIES.map((cat) => {
                const active = focus.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      active
                        ? 'bg-ink-hover border-ultra/50 text-white shadow-sm'
                        : 'bg-ink/50 border-line text-ice/60 hover:text-ice'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="font-semibold">{cat.label}</span>
                    </span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      active ? 'bg-ultra text-white font-bold' : 'border border-line'
                    }`}>
                      {active ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Threshold */}
          <div className="surface p-4 border-line space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              Severity Threshold
            </label>
            <p className="text-xs text-ice/60">
              Only post GitHub PR review comments for issues meeting or exceeding this level.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {(['low', 'medium', 'high', 'critical'] as Severity[]).map((sev) => {
                const active = severityThreshold === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityThreshold(sev)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold uppercase text-center transition-all ${
                      active
                        ? 'bg-white text-ink font-bold shadow-md'
                        : 'bg-ink border border-line text-ice/70 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: AI Engine, Sensitivity & Guidelines */}
        <div className="space-y-5">
          {/* AI Model Engine */}
          <div className="surface p-4 border-line space-y-3">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              Inference Engine
            </label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => {
                const active = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id as any)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      active
                        ? 'bg-ink-hover border-ultra/50 text-white font-semibold'
                        : 'bg-ink/50 border-line text-ice/60 hover:text-ice'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-ice font-mono">
                      {p.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Max Comments Dial */}
          <div className="surface p-4 border-line space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Max Feedback Comments / PR
              </label>
              <span className="font-mono text-sm font-bold text-white">{maxComments}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={maxComments}
              onChange={(e) => setMaxComments(Number(e.target.value))}
              className="w-full accent-ultra cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-ice/50 font-mono">
              <span>1 (Focused)</span>
              <span>15 (Balanced)</span>
              <span>30 (Exhaustive)</span>
            </div>
          </div>

          {/* Privacy & Guardrails Toggle */}
          <div className="surface p-4 border-line space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Lock size={13} className="text-mint" />
                  Strict Zero-Leak Mode
                </div>
                <div className="text-[11px] text-ice/60 mt-0.5">
                  Mask API secrets and private tokens client-side before submission
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStrictPrivacyMode(!strictPrivacyMode)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  strictPrivacyMode ? 'bg-mint' : 'bg-ink border border-line'
                }`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  strictPrivacyMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          {/* Custom Guidelines */}
          <div className="surface p-4 border-line space-y-2">
            <label className="text-xs font-bold text-white uppercase tracking-wider block">
              Custom Review Guidelines
            </label>
            <textarea
              className="w-full h-24 p-2.5 bg-ink rounded-lg border border-line text-xs font-mono text-bone focus:outline-none focus:border-ultra"
              placeholder="e.g. Enforce React hooks dependencies; flag non-null assertions (!); require JSDoc on export functions..."
              value={customGuidelines}
              onChange={(e) => setCustomGuidelines(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
