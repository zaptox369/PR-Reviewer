import React from 'react';
import { GitMerge, LayoutGrid, GitPullRequest, Terminal, ShieldCheck, Settings, LogIn, Github } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Tab = 'overview' | 'reviews' | 'sandbox' | 'audit' | 'settings';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenSandbox?: () => void;
  appInstallUrl?: string | null;
}

const NAV_ITEMS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview',  label: 'Overview',   icon: LayoutGrid },
  { id: 'reviews',   label: 'Reviews',    icon: GitPullRequest },
  { id: 'sandbox',   label: 'Sandbox',    icon: Terminal },
  { id: 'audit',     label: 'Audit Log',  icon: ShieldCheck },
  { id: 'settings',  label: 'Settings',   icon: Settings },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, appInstallUrl }) => {
  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        {/* Brand */}
        <div className="app-brand">
          <div className="app-brand-mark">
            <GitMerge size={16} color="white" />
          </div>
          <span className="app-brand-name">RevAI</span>
        </div>

        {/* Nav tabs */}
        <nav className="app-nav-tabs" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`tab-btn${activeTab === id ? ' active' : ''}`}
              aria-current={activeTab === id ? 'page' : undefined}
              title={label}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Action */}
        <div className="app-nav-action">
          <a
            className="app-install-link"
            href={appInstallUrl ?? 'https://github.com/settings/apps/new'}
            target="_blank"
            rel="noreferrer"
            title={appInstallUrl ? 'Install RevAI on a repository' : 'Create a GitHub App before connecting repositories'}
          >
              <Github size={14} />
              {appInstallUrl ? 'Connect GitHub' : 'Set up GitHub'}
          </a>
          <button className="btn-primary" type="button" disabled title="Sign-in is not available yet">
            <LogIn size={13} />
            Sign in
          </button>
        </div>
      </div>
    </header>
  );
};
