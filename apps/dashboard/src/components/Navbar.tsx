import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  GitPullRequest,
  Terminal,
  ShieldCheck,
  Settings,
  LogIn,
  Github,
  LogOut,
  ExternalLink,
  X,
  Share2,
  Search,
  Menu,
  Mail,
  KeyRound,
  Building2,
  UserCheck,
  ChevronDown,
  Lock,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  fetchAuthStatus,
  getGoogleSignInUrl,
  getGithubSignInUrl,
  getGitlabSignInUrl,
  signInWithCredentials,
  signInWithToken,
  signOut,
} from '../services/api.js';
import type { AuthStatus, AuthUser } from '../services/api.js';

export type Tab = 'overview' | 'reviews' | 'sandbox' | 'blast' | 'audit' | 'settings';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenSandbox?: () => void;
  onOpenCommandPalette?: () => void;
  appInstallUrl?: string | null;
  onSignedIn?: (user: AuthUser) => void;
  onSignedOut?: () => void;
}

const NAV_ITEMS: { id: Tab; label: string; icon: LucideIcon; badge?: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'reviews', label: 'Reviews', icon: GitPullRequest },
  { id: 'sandbox', label: 'Simulator', icon: Terminal, badge: 'Live' },
  { id: 'blast', label: 'Blast Radius', icon: Share2 },
  { id: 'audit', label: 'Audit', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

type SignInMethodTab = 'providers' | 'email' | 'token' | 'sso';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCommandPalette,
  appInstallUrl,
  onSignedIn,
  onSignedOut,
}) => {
  const [auth, setAuth] = useState<AuthStatus>({ configured: false, user: null });
  const [showGithubGuide, setShowGithubGuide] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInTab, setSignInTab] = useState<SignInMethodTab>('providers');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Email/Password form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Personal Access Token state
  const [accessToken, setAccessToken] = useState('');
  const [tokenProvider, setTokenProvider] = useState<'github' | 'gitlab' | 'token'>('github');

  // Enterprise SSO state
  const [ssoEmail, setSsoEmail] = useState('');
  const [ssoDomain, setSsoDomain] = useState('acme-corp.okta.com');

  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authFormError, setAuthFormError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAuthStatus()
      .then(setAuth)
      .catch((error: unknown) => console.error('Failed to load sign-in status:', error));
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuth((current) => ({ ...current, configured: true, user: null }));
      onSignedOut?.();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const completeSignIn = (status: AuthStatus) => {
    setAuth(status);
    setShowSignInModal(false);
    setAuthFormError(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
    setAccessToken('');
    if (status.user) {
      onSignedIn?.(status.user);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormError(null);
    setAuthSubmitting(true);
    try {
      const status = await signInWithCredentials({
        email,
        password,
        name: displayName || undefined,
        provider: 'email',
      });
      completeSignIn(status);
    } catch (err: any) {
      setAuthFormError(err.message || 'Could not sign in with email.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleTokenSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormError(null);
    setAuthSubmitting(true);
    try {
      const status = await signInWithToken({
        token: accessToken,
        provider: tokenProvider,
      });
      completeSignIn(status);
    } catch (err: any) {
      setAuthFormError(err.message || 'Could not verify access token.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSsoSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFormError(null);
    setAuthSubmitting(true);
    try {
      const status = await signInWithCredentials({
        email: ssoEmail,
        name: ssoEmail.split('@')[0],
        provider: 'sso',
      });
      completeSignIn(status);
    } catch (err: any) {
      setAuthFormError(err.message || 'SSO authentication failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handlePersonaQuickSignIn = async (
    personaEmail: string,
    personaName: string,
    provider: 'github' | 'google' | 'gitlab' | 'sso'
  ) => {
    setAuthFormError(null);
    setAuthSubmitting(true);
    try {
      const status = await signInWithCredentials({
        email: personaEmail,
        name: personaName,
        provider,
      });
      completeSignIn(status);
    } catch (err: any) {
      setAuthFormError(err.message || 'Quick sign-in failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const providerBadgeLabel = (provider?: string) => {
    switch (provider) {
      case 'github':
        return 'GitHub';
      case 'google':
        return 'Google';
      case 'gitlab':
        return 'GitLab';
      case 'sso':
        return 'SSO';
      case 'token':
        return 'PAT';
      default:
        return 'Email';
    }
  };

  return (
    <>
      <header className="app-navbar">
        <div className="app-navbar-inner">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('overview');
              setMobileMenuOpen(false);
            }}
            className="app-brand bg-transparent border-0 text-left p-0"
            aria-label="RevAI Home"
          >
            <div className="app-brand-mark">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="12" cy="16" r="7.5" stroke="#cbd8ff" strokeWidth="2.2" />
                <circle cx="20" cy="16" r="7.5" stroke="#1a2fd4" strokeWidth="2.2" />
                <circle cx="16" cy="16" r="2.8" fill="#ff5a2c" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="app-brand-name">RevAI</span>
              <span className="app-brand-badge">Gate</span>
            </div>
          </button>

          {/* Navigation Pill tabs (Desktop) */}
          <nav className="app-nav-tabs" aria-label="Main navigation">
            {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`tab-btn${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-ice/70'} />
                  <span>{label}</span>
                  {badge && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-ember/20 text-ember border border-ember/30 uppercase tracking-wider">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action pill group */}
          <div className="app-nav-action">
            {/* Quick Search / Command Palette Trigger */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/12 border border-line text-xs text-ice/80 hover:text-white transition-colors"
                title="Open Quick Command Palette (Ctrl+K / ⌘K)"
              >
                <Search size={13} className="text-ice/70" />
                <span className="hidden xl:inline text-ice/60">Quick Jump...</span>
                <kbd className="kbd text-[10px] py-0 px-1.5 hidden sm:inline">⌘K</kbd>
              </button>
            )}

            {appInstallUrl ? (
              <a
                className="app-install-link hidden sm:inline-flex"
                href={appInstallUrl}
                target="_blank"
                rel="noreferrer"
                title="Connect GitHub repository"
              >
                <Github size={13} />
                <span className="hidden lg:inline">Connect GitHub</span>
              </a>
            ) : (
              <button
                className="app-install-link hidden sm:inline-flex"
                type="button"
                onClick={() => setShowGithubGuide(true)}
                title="Connect GitHub repository"
              >
                <Github size={13} />
                <span className="hidden lg:inline">Set up GitHub</span>
              </button>
            )}

            {auth.user ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthFormError(null);
                    setShowSignInModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs text-white border border-line transition-colors"
                  title="Switch account or sign in with another provider"
                >
                  {auth.user.avatarUrl ? (
                    <img
                      src={auth.user.avatarUrl}
                      alt=""
                      className="w-4 h-4 rounded-full border border-white/20"
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-mint" />
                  )}
                  <span className="account-name font-medium">{auth.user.login}</span>
                  {auth.user.provider && auth.user.id !== 'workspace-operator' && (
                    <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-mono text-ice/80">
                      {providerBadgeLabel(auth.user.provider)}
                    </span>
                  )}
                  <ChevronDown size={11} className="opacity-60" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="inline-flex items-center justify-center p-1.5 rounded-full bg-white/5 hover:bg-ember/20 text-ice/70 hover:text-ember border border-line transition-colors"
                  title={`Sign out (${auth.user.login})`}
                  aria-label={`Sign out ${auth.user.login}`}
                >
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthFormError(null);
                  setShowSignInModal(true);
                }}
                className="btn-primary"
                title="Sign in to RevAI"
              >
                <LogIn size={13} />
                <span>Sign in</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-full bg-white/8 hover:bg-white/15 text-white border border-line"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-4 top-20 z-40 md:hidden surface p-3 border-line-bright shadow-card slide-up space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                  isActive ? 'bg-white text-ink font-bold' : 'text-ice hover:bg-white/8'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{label}</span>
                </span>
                {badge && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-ember/20 text-ember border border-ember/30 uppercase">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-line flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowSignInModal(true);
              }}
              className="btn-primary w-full text-xs py-2"
            >
              <LogIn size={13} /> Sign In / Switch Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowGithubGuide(true);
              }}
              className="btn-ghost w-full text-xs py-2"
            >
              <Github size={13} /> Connect GitHub
            </button>
          </div>
        </div>
      )}

      {/* Multi-Provider Sign-In Modal */}
      {showSignInModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signin-modal-title"
          onClick={() => setShowSignInModal(false)}
        >
          <div
            className="surface max-w-md w-full p-6 relative slide-up border-line-bright shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowSignInModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-ice/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close sign-in modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-line flex items-center justify-center">
                <Lock size={18} className="text-ember" />
              </div>
              <div>
                <h3 id="signin-modal-title" className="head text-lg text-white">
                  Sign in to RevAI Gatekeeper
                </h3>
                <p className="text-xs text-ice/70">
                  Choose your identity provider, work email, or developer token
                </p>
              </div>
            </div>

            {/* Method Selector Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-ink/80 border border-line mb-4 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSignInTab('providers');
                  setAuthFormError(null);
                }}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                  signInTab === 'providers'
                    ? 'bg-white text-ink font-semibold'
                    : 'text-ice/70 hover:text-white'
                }`}
              >
                OAuth
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInTab('email');
                  setAuthFormError(null);
                }}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                  signInTab === 'email'
                    ? 'bg-white text-ink font-semibold'
                    : 'text-ice/70 hover:text-white'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInTab('token');
                  setAuthFormError(null);
                }}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                  signInTab === 'token'
                    ? 'bg-white text-ink font-semibold'
                    : 'text-ice/70 hover:text-white'
                }`}
              >
                PAT / Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInTab('sso');
                  setAuthFormError(null);
                }}
                className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                  signInTab === 'sso'
                    ? 'bg-white text-ink font-semibold'
                    : 'text-ice/70 hover:text-white'
                }`}
              >
                SSO
              </button>
            </div>

            {authFormError && (
              <div className="mb-4 p-3 rounded-xl bg-ember/15 border border-ember/40 text-xs text-ember">
                {authFormError}
              </div>
            )}

            {/* TAB 1: OAuth Providers (GitHub, Google, GitLab + 1-Click Personas) */}
            {signInTab === 'providers' && (
              <div className="space-y-3">
                <a
                  href={getGithubSignInUrl()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-ink font-semibold text-xs flex items-center justify-center gap-2.5 hover:bg-ice transition-colors"
                >
                  <Github size={16} />
                  <span>Continue with GitHub</span>
                </a>

                <a
                  href={getGoogleSignInUrl()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-line text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.8z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.9 7.4 24 12 24z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </a>

                <a
                  href={getGitlabSignInUrl()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-line text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"
                      fill="#FC6D26"
                    />
                  </svg>
                  <span>Continue with GitLab</span>
                </a>

                <div className="relative py-2">
                  <div className=" inset-0 flex items-center">
                    <div className="w-full border-t border-line" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-ink-card px-2 text-[10px] font-mono uppercase tracking-wider text-ice/50">
                      Or 1-Click Reviewer Persona
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={() =>
                      void handlePersonaQuickSignIn('sec-hawk@revai.dev', 'sec-hawk-lead', 'github')
                    }
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-left transition-colors"
                  >
                    <div className="text-[10px] font-mono text-ember font-bold flex items-center gap-1">
                      <Sparkles size={10} /> Security
                    </div>
                    <div className="text-xs font-semibold text-white truncate">sec-hawk</div>
                  </button>

                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={() =>
                      void handlePersonaQuickSignIn('arch-purist@revai.dev', 'principal-arch', 'gitlab')
                    }
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-left transition-colors"
                  >
                    <div className="text-[10px] font-mono text-mint font-bold flex items-center gap-1">
                      <UserCheck size={10} /> Architect
                    </div>
                    <div className="text-xs font-semibold text-white truncate">principal-arch</div>
                  </button>

                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={() =>
                      void handlePersonaQuickSignIn('sre-oncall@revai.dev', 'staff-sre', 'sso')
                    }
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-line text-left transition-colors"
                  >
                    <div className="text-[10px] font-mono text-ultra font-bold flex items-center gap-1">
                      <Building2 size={10} /> SRE Lead
                    </div>
                    <div className="text-xs font-semibold text-white truncate">staff-sre</div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Email & Password Sign-In */}
            {signInTab === 'email' && (
              <form onSubmit={(e) => void handleEmailSignIn(e)} className="space-y-3">
                <div>
                  <label className="block text-xs text-ice/80 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-ink border border-line text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ice/80 mb-1">Display Handle (optional)</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. alex-sec"
                    className="w-full px-3 py-2 rounded-xl bg-ink border border-line text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ice/80 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-ink border border-line text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="btn-primary w-full py-2.5 justify-center text-xs font-semibold"
                >
                  <Mail size={14} />
                  <span>{authSubmitting ? 'Signing in...' : 'Sign in with Email'}</span>
                </button>
              </form>
            )}

            {/* TAB 3: Personal Access Token (PAT) / API Key */}
            {signInTab === 'token' && (
              <form onSubmit={(e) => void handleTokenSignIn(e)} className="space-y-3">
                <div>
                  <label className="block text-xs text-ice/80 mb-1">Token Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['github', 'gitlab', 'token'] as const).map((prov) => (
                      <button
                        key={prov}
                        type="button"
                        onClick={() => setTokenProvider(prov)}
                        className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium capitalize transition-colors ${
                          tokenProvider === prov
                            ? 'bg-white/15 border-white text-white'
                            : 'bg-ink border-line text-ice/70 hover:text-white'
                        }`}
                      >
                        {prov === 'token' ? 'RevAI Key' : prov}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-ice/80 mb-1">
                    {tokenProvider === 'github'
                      ? 'GitHub Personal Access Token (ghp_...)'
                      : tokenProvider === 'gitlab'
                        ? 'GitLab Personal Access Token (glpat-...)'
                        : 'RevAI Operator API Key'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={
                      tokenProvider === 'github'
                        ? 'ghp_xxxxxxxxxxxxxxxxxxxx'
                        : tokenProvider === 'gitlab'
                          ? 'glpat-xxxxxxxxxxxxxxxx'
                          : 'revai_live_xxxxxxxxxxxxxxxx'
                    }
                    className="w-full px-3 py-2 rounded-xl bg-ink border border-line text-xs text-white font-mono focus:outline-none focus:border-white/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="btn-primary w-full py-2.5 justify-center text-xs font-semibold"
                >
                  <KeyRound size={14} />
                  <span>{authSubmitting ? 'Verifying Token...' : 'Authenticate with Token'}</span>
                </button>
              </form>
            )}

            {/* TAB 4: Enterprise SSO (SAML 2.0 / Okta / Entra ID) */}
            {signInTab === 'sso' && (
              <form onSubmit={(e) => void handleSsoSignIn(e)} className="space-y-3">
                <div>
                  <label className="block text-xs text-ice/80 mb-1">Organization Identity Domain</label>
                  <input
                    type="text"
                    required
                    value={ssoDomain}
                    onChange={(e) => setSsoDomain(e.target.value)}
                    placeholder="company.okta.com"
                    className="w-full px-3 py-2 rounded-xl bg-ink border border-line text-xs text-white font-mono focus:outline-none focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ice/80 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    value={ssoEmail}
                    onChange={(e) => setSsoEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-ink border border-line text-xs text-white focus:outline-none focus:border-white/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="btn-primary w-full py-2.5 justify-center text-xs font-semibold"
                >
                  <Building2 size={14} />
                  <span>{authSubmitting ? 'Connecting IdP...' : 'Continue with Enterprise SSO'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GitHub Guide Modal */}
      {showGithubGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGithubGuide(false)}
        >
          <div
            className="surface max-w-lg w-full p-6 relative slide-up border-line-bright"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowGithubGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-ice/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-line flex items-center justify-center">
                <Github size={20} className="text-white" />
              </div>
              <div>
                <h3 className="head text-lg text-white">Connect GitHub Repository</h3>
                <p className="text-xs text-ice/70">Activate automated PR simulations and gatekeeper reviews</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-ice/85">
              <p>To install the RevAI gatekeeper on your GitHub organization:</p>
              <ol className="list-decimal list-inside space-y-2 text-xs bg-ink/60 p-3.5 rounded-xl border border-line">
                <li>
                  Create or configure your <strong>GitHub App</strong> in GitHub Developer Settings.
                </li>
                <li>
                  Set Webhook URL to:{' '}
                  <code className="text-ember font-mono text-[11px]">/api/webhooks/github</code>
                </li>
                <li>
                  Subscribe to <strong>Pull request</strong> and <strong>Issue comment</strong> events.
                </li>
                <li>Add the App Private Key and Webhook Secret in your server environment variables.</li>
              </ol>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={() => setShowGithubGuide(false)}>
                Close
              </button>
              <a
                className="btn-primary"
                href="https://github.com/settings/apps"
                target="_blank"
                rel="noreferrer"
              >
                GitHub App Settings <ExternalLink size={13} className="ml-1" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
