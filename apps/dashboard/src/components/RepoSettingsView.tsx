import React, { useState } from 'react';
import { Settings, Save, Check, FileText, Sliders, Shield, Code2, AlertTriangle, Lock, Cpu } from 'lucide-react';
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

export const RepoSettingsView: React.FC<RepoSettingsViewProps> = ({ repos, onRefresh }) => {
  const [selectedRepoId, setSelectedRepoId] = useState<string>(repos[0]?.id || '');
  const currentRepo = repos.find((r) => r.id === selectedRepoId) || repos[0];

  const [focus, setFocus] = useState<Category[]>(currentRepo?.focus || []);
  const [severityThreshold, setSeverityThreshold] = useState<Severity>(currentRepo?.severityThreshold || 'medium');
  const [maxComments, setMaxComments] = useState<number>(currentRepo?.maxComments || 15);
  const [customGuidelines, setCustomGuidelines] = useState<string>(currentRepo?.customGuidelines || '');
  const [autoReview, setAutoReview] = useState<boolean>(currentRepo?.autoReviewEnabled ?? true);
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'gemini' | 'ollama' | 'heuristic-engine'>(
    currentRepo?.provider || 'heuristic-engine'
  );
  const [strictPrivacyMode, setStrictPrivacyMode] = useState<boolean>(currentRepo?.strictPrivacyMode ?? true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state if switching repos
  const handleSelectRepo = (repoId: string) => {
    setSelectedRepoId(repoId);
    const target = repos.find((r) => r.id === repoId);
    if (target) {
      setFocus(target.focus);
      setSeverityThreshold(target.severityThreshold);
      setMaxComments(target.maxComments);
      setCustomGuidelines(target.customGuidelines);
      setAutoReview(target.autoReviewEnabled);
      setProvider(target.provider || 'heuristic-engine');
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
    } catch (err) {
      console.error('Failed to save repo settings:', err);
      setSaveError('Could not save these settings. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const generatedYaml = `
# .prreviewer.yml - Enterprise Code Review Configuration
version: 1.0
focus:
${focus.map((f) => `  - ${f}`).join('\n')}

severity_threshold: ${severityThreshold} # low | medium | high | critical
max_comments: ${maxComments}

privacy:
  strict_mode: ${strictPrivacyMode} # zero cloud leakage of credentials & PII
  provider: ${provider}

ignore_paths:
${(currentRepo?.ignorePaths || ['**/*.lock', 'dist/**']).map((p) => `  - "${p}"`).join('\n')}

custom_guidelines: |
${customGuidelines.split('\n').map((l) => `  ${l}`).join('\n')}
`.trim();

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6">
      {/* Header and Repo Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            Repository Review Rules &amp; .prreviewer.yml
          </h2>
          <p className="text-xs text-slate-400">
            Configure automated evaluation priorities, comment caps, and custom project standards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-medium">Select Repository:</label>
          <select
            value={selectedRepoId}
            onChange={(e) => handleSelectRepo(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
          >
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.repo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Engine Provider & Privacy Settings */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-400" />
                Review Engine Provider
              </span>
              <span className="text-[10px] text-slate-400">Multi-Model &amp; On-Premise Support</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Active Review Engine</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="heuristic-engine">Heuristic Engine (Zero Cost, Offline, Deterministic)</option>
                  <option value="gemini">Google Gemini 1.5 Flash (Fast &amp; Accurate)</option>
                  <option value="openai">OpenAI GPT-4o (High Reasoning)</option>
                  <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                  <option value="ollama">Ollama (100% Local Air-Gapped Model)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Data Privacy &amp; Secret Guard</label>
                <button
                  type="button"
                  onClick={() => setStrictPrivacyMode(!strictPrivacyMode)}
                  className={`w-full p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    strictPrivacyMode
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    Strict Data Privacy Mode
                  </span>
                  <span className="font-bold text-[10px] uppercase">
                    {strictPrivacyMode ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When <strong>Strict Data Privacy Mode</strong> is enabled, AWS tokens, GitHub PATs, private keys, database passwords, and customer emails are automatically stripped and replaced with non-reversible cryptographic hashes before sending any diff chunks to external LLM providers.
            </p>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Review Focus Areas
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Only post comments corresponding to selected categories
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isChecked = focus.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isChecked
                        ? 'bg-sky-500/10 border-sky-500/50 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-medium flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-700'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity & Max Comments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
                Minimum Severity Threshold
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Suppresses low-severity or noisy feedback
              </p>
              <select
                value={severityThreshold}
                onChange={(e) => setSeverityThreshold(e.target.value as Severity)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="low">Low (Post all findings)</option>
                <option value="medium">Medium (Post medium, high, and critical)</option>
                <option value="high">High (Only high and critical)</option>
                <option value="critical">Critical (Zero-tolerance blockers only)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Max Inline Comments Per PR
                </label>
                <span className="text-xs font-bold text-sky-400">{maxComments} comments</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">
                Caps comments to prevent review fatigue
              </p>
              <input
                type="range"
                min="3"
                max="35"
                value={maxComments}
                onChange={(e) => setMaxComments(parseInt(e.target.value, 10))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>

          {/* Custom Guidelines Editor */}
          <div>
            <label className="text-xs font-bold text-white uppercase tracking-wider block mb-1">
              Custom Project Guidelines
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Natural language conventions fed to the review prompt (e.g. naming conventions, architectural standards)
            </p>
            <textarea
              rows={5}
              value={customGuidelines}
              onChange={(e) => setCustomGuidelines(e.target.value)}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed"
            />
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Settings take effect immediately on next incoming webhook or simulator run.
            </span>

            <div className="flex items-end gap-3">
              {saveError && <span role="alert" className="text-xs text-rose-400">{saveError}</span>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-lg shadow-sky-500/20 active:scale-95 disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview Column (1/3 width): Live .prreviewer.yml */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              .prreviewer.yml Preview
            </label>
            <span className="text-[10px] text-slate-500">Auto-generated</span>
          </div>

          <div className="p-4 rounded-xl bg-[#070A12] border border-slate-800 text-xs font-mono text-sky-300 whitespace-pre-wrap leading-relaxed overflow-x-auto shadow-inner">
            {generatedYaml}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" /> Git-Versioned Option
            </div>
            <p>
              You can commit this exact content to your repository root as <code className="text-slate-200 font-mono">.prreviewer.yml</code> for version-controlled team governance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
