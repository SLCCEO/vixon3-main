import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Database,
  Download,
  ExternalLink,
  Film,
  LogOut,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import VoiceAssistantCard from './components/voice/VoiceAssistantCard';

const formatTimestamp = (value) => {
  if (!value) return 'No heartbeat recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Timestamp unavailable' : date.toLocaleString();
};

const heartbeatStyles = {
  healthy: { label: 'Healthy', className: 'text-emerald-400' },
  stale: { label: 'Stale', className: 'text-amber-400' },
  not_initialized: { label: 'Not initialized', className: 'text-amber-400' },
  unknown: { label: 'Unknown', className: 'text-gray-400' },
};

export default function VexNodePage() {
  const shiftStreamUrl = import.meta.env.VITE_SHIFTSTREAM_URL;
  const [dashboard, setDashboard] = useState(null);
  const [access, setAccess] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [caseSearch, setCaseSearch] = useState('');
  const [caseOffset, setCaseOffset] = useState(0);
  const [hasMoreCases, setHasMoreCases] = useState(false);
  const [twitchSyncing, setTwitchSyncing] = useState(false);
  const [twitchSyncStatus, setTwitchSyncStatus] = useState('');
  const [activeVoicePersona, setActiveVoicePersona] = useState(null);

  const loadDashboard = async (signal, searchQuery = caseSearch, offset = caseOffset) => {
    setBusy(true);
    setError('');
    try {
      const query = new URLSearchParams({ q: searchQuery, offset: String(offset) });
      const response = await fetch(`/api/vex-node/dashboard?${query}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      });
      const data = await response.json();

      if (response.status === 401) {
        setDashboard(null);
        setAccess('signed-out');
        return;
      }
      if (response.status === 403) {
        setDashboard(null);
        const editorResponse = await fetch('/api/vex-node/editor-access', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal,
        });
        if (editorResponse.ok) {
          setAccess('editor-only');
        } else {
          const editorData = await editorResponse.json();
          setError(editorData.error || 'Unable to verify editor access.');
          setAccess(editorResponse.status === 401 ? 'signed-out' : editorResponse.status === 403 ? 'denied' : 'error');
        }
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to load VEX-NODE.');

      setDashboard(data);
      setHasMoreCases(data.hasMoreCases);
      setAccess('authorized');
    } catch (requestError) {
      if (requestError.name !== 'AbortError') {
        setError(requestError.message || 'Unable to load VEX-NODE.');
        if (access === 'loading') setAccess('error');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCaseSearch = async (event) => {
    event.preventDefault();
    setCaseOffset(0);
    await loadDashboard(undefined, caseSearch.trim(), 0);
  };

  const handleCasePage = async (offset) => {
    setCaseOffset(offset);
    await loadDashboard(undefined, caseSearch.trim(), offset);
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/vex-node/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Unable to end the VEX-NODE session.');
      setDashboard(null);
      setAccess('signed-out');
    } catch (logoutError) {
      setError(logoutError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTwitchSync = async () => {
    setTwitchSyncing(true);
    setTwitchSyncStatus('');
    try {
      const response = await fetch('/api/vex-node/twitch-sync', {
        method: 'POST',
        credentials: 'same-origin',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Twitch ban-list sync failed.');
      setTwitchSyncStatus(`Synced ${result.activeBans} bans and ${result.activeTimeouts} timeouts from ${result.channel}.`);
      await loadDashboard();
    } catch (syncError) {
      setTwitchSyncStatus(syncError.message || 'Twitch ban-list sync failed.');
    } finally {
      setTwitchSyncing(false);
    }
  };

  const authStatus = new URLSearchParams(window.location.search).get('auth');
  const authMessage = authStatus === 'denied'
    ? 'Your Discord account does not have an approved VEX-NODE role.'
    : authStatus === 'failed'
      ? 'Discord sign-in did not complete. Please try again.'
      : '';

  if (access !== 'authorized') {
    const configuredError = access === 'error';
    const roleDenied = access === 'denied';
    if (access === 'editor-only') {
      return (
        <main className="relative min-h-screen overflow-hidden bg-[#080505] px-5 py-14 font-mono text-gray-200 sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.18),_transparent_55%)]" />
          <div className="relative mx-auto flex min-h-[75vh] max-w-3xl flex-col justify-center">
            <a href="/" className="mb-12 inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 transition hover:text-white">
              <ArrowLeft size={14} /> Public site
            </a>
            <div className="border border-red-600/25 bg-[#100909]/90 p-8 shadow-[0_0_70px_rgba(220,38,38,0.08)] sm:p-12">
              <div className="mb-7 flex h-12 w-12 items-center justify-center border border-red-500/30 bg-red-500/10 text-[#fb394f]">
                <Film size={24} />
              </div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#fb394f]">VEX-NODE-01 // Editor access</div>
              <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tight text-white sm:text-5xl">Production tools</h1>
              <p className="mb-8 max-w-xl text-sm leading-7 text-gray-400">
                Your editor role grants access to the standalone video workspace. Other control-terminal modules remain restricted to staff roles.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="/editor" className="inline-flex items-center gap-3 bg-red-600 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black">
                  <Film size={16} /> Open video editor
                </a>
                <button type="button" onClick={handleLogout} disabled={busy} className="inline-flex items-center gap-3 border border-white/15 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 transition hover:bg-white/5 disabled:opacity-50">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          </div>
        </main>
      );
    }
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#080505] px-5 py-14 font-mono text-gray-200 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.18),_transparent_55%)]" />
        <div className="relative mx-auto flex min-h-[75vh] max-w-3xl flex-col justify-center">
          <a href="/" className="mb-12 inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 transition hover:text-white">
            <ArrowLeft size={14} /> Public site
          </a>
          <div className="border border-red-600/25 bg-[#100909]/90 p-8 shadow-[0_0_70px_rgba(220,38,38,0.08)] sm:p-12">
            <div className="mb-7 flex h-12 w-12 items-center justify-center border border-red-500/30 bg-red-500/10 text-[#fb394f]">
              <ShieldCheck size={24} />
            </div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#fb394f]">VEX-NODE-01 // Restricted</div>
            <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tight text-white sm:text-5xl">Control terminal</h1>
            <p className="mb-8 max-w-xl text-sm leading-7 text-gray-400">
              Staff access is verified through Discord. Only accounts with an approved server role can view system health.
            </p>
            {access === 'loading' && <p className="mb-6 text-xs uppercase tracking-widest text-gray-500">Verifying session…</p>}
            {(authMessage || error) && (
              <div role="alert" className="mb-6 flex items-start gap-3 border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200">
                <AlertTriangle className="mt-1 shrink-0" size={16} />
                <span>{error || authMessage}</span>
              </div>
            )}
            {roleDenied && !authMessage && !error && (
              <p className="mb-6 text-sm text-amber-200">This Discord account is not authorized for the control terminal.</p>
            )}
            {configuredError && !authMessage && !error && (
              <p className="mb-6 text-sm text-gray-400">VEX-NODE authentication is not configured. Contact a system administrator.</p>
            )}
            {access === 'signed-out' || access === 'denied' || access === 'error' ? (
              <a href="/api/vex-node/login" className="inline-flex items-center gap-3 bg-red-600 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black">
                <ShieldCheck size={16} /> Sign in with Discord
              </a>
            ) : null}
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-gray-600">Session data is encrypted and held in a short-lived HttpOnly cookie.</p>
        </div>
      </main>
    );
  }

  const heartbeat = dashboard.heartbeat;
  const heartbeatStyle = heartbeatStyles[heartbeat.status] || heartbeatStyles.unknown;
  const moderationCases = dashboard.moderationCases || [];
  const realtimeAssistants = dashboard.modules?.realtimeAssistants || {};
  const availableAssistantCount = Number(realtimeAssistants.planner) + Number(realtimeAssistants.tech_ops);
  const currentHour = new Date().getHours();
  const recentArchiveCases = moderationCases.slice(0, 5);
  const greeting = currentHour < 12
    ? 'morning'
    : currentHour < 18
      ? 'afternoon'
      : 'evening';
  const archiveStatus = dashboard.modules?.moderationArchive === 'connected'
    ? 'Connected'
    : 'Unavailable';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08090b] font-mono text-gray-200">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(127,29,29,0.2),_transparent_48%)]" />

      <aside aria-label="VEX-NODE navigation" className="fixed inset-y-0 left-0 z-20 hidden w-16 flex-col items-center border-r border-white/10 bg-[#09090b]/95 py-5 lg:flex">
        <a href="/" aria-label="Public website" className="mb-8 grid h-9 w-9 place-items-center text-[#fb394f] transition hover:bg-red-500/10 hover:text-white">
          <ShieldCheck size={20} />
        </a>
        <nav className="flex flex-1 flex-col items-center gap-3">
          <a href="#overview" aria-label="Overview" title="Overview" className="grid h-9 w-9 place-items-center border border-red-500/30 bg-red-500/10 text-red-300"><Activity size={17} /></a>
          <a href="#voice" aria-label="AI voice links" title="AI voice links" className="grid h-9 w-9 place-items-center text-gray-500 transition hover:bg-white/5 hover:text-white"><Radio size={17} /></a>
          <a href="#services" aria-label="System services" title="System services" className="grid h-9 w-9 place-items-center text-gray-500 transition hover:bg-white/5 hover:text-white"><Database size={17} /></a>
          <a href="#engineering" aria-label="Engineering queue" title="Engineering queue" className="grid h-9 w-9 place-items-center text-gray-500 transition hover:bg-white/5 hover:text-white"><Wrench size={17} /></a>
          <a href="#moderation" aria-label="Moderation archive" title="Moderation archive" className="grid h-9 w-9 place-items-center text-gray-500 transition hover:bg-white/5 hover:text-white"><ShieldCheck size={17} /></a>
        </nav>
        <button type="button" onClick={handleLogout} disabled={busy} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 place-items-center text-gray-600 transition hover:text-white disabled:opacity-40">
          <LogOut size={17} />
        </button>
      </aside>

      <div className="relative mx-auto max-w-[1480px] px-4 pb-12 pt-6 sm:px-7 lg:pl-24 lg:pr-10">
        <header id="overview" className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.28em] text-gray-500">
              <span className="text-[#fb394f]">01</span> Home server // control surface
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-100 sm:text-3xl">
              Good {greeting}, <span className="text-[#fb394f]">{dashboard.user.username}</span>.
            </h1>
            <p className="mt-2 text-[10px] leading-5 text-gray-500">Authenticated VEX-NODE console. Only connected data sources are reported below.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 border border-white/10 bg-black/30 px-4 py-3">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
              <span>
                <span className="block text-[9px] font-black uppercase tracking-widest text-gray-300">VEX-NODE-01</span>
                <span className="mt-1 block text-[8px] uppercase tracking-widest text-gray-600">Staff session authorized</span>
              </span>
            </div>
            <button type="button" onClick={() => loadDashboard()} disabled={busy} className="inline-flex items-center gap-2 border border-red-500/25 px-4 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-500/10 disabled:opacity-50">
              <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        <nav aria-label="Dashboard sections" className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
          {[
            ['#overview', 'Overview'],
            ['#voice', 'AI Voice'],
            ['#services', 'Services'],
            ['#engineering', 'Roadmap'],
            ['#moderation', 'Moderation'],
          ].map(([href, label]) => <a key={href} href={href} className="shrink-0 border border-white/10 bg-black/20 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-gray-400">{label}</a>)}
          <button type="button" onClick={handleLogout} disabled={busy} className="shrink-0 border border-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-gray-400">Sign out</button>
        </nav>

        {error && <div role="alert" className="mb-6 border border-red-500/30 bg-red-500/5 p-4 text-xs leading-5 text-red-200">{error}</div>}

        <section aria-label="System status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="border border-white/10 bg-[#101014]/90 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500">Supabase heartbeat</span>
              <Database size={14} className="text-[#fb394f]" />
            </div>
            <div className={`text-xl font-semibold ${heartbeatStyle.className}`}>{heartbeatStyle.label}</div>
            <div className="mt-3 border-t border-white/10 pt-2 text-[8px] text-gray-600">LAST ACTIVITY · {formatTimestamp(heartbeat.lastSeenAt)}</div>
          </article>
          <article className="border border-white/10 bg-[#101014]/90 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500">Moderation archive</span>
              <ShieldCheck size={14} className="text-[#fb394f]" />
            </div>
            <div className={`text-xl font-semibold ${archiveStatus === 'Connected' ? 'text-emerald-400' : 'text-amber-400'}`}>{archiveStatus}</div>
            <div className="mt-3 border-t border-white/10 pt-2 text-[8px] text-gray-600">PRIVATE SUPABASE STORAGE</div>
          </article>
          <article className="border border-white/10 bg-[#101014]/90 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500">Twitch moderation</span>
              <Radio size={14} className="text-gray-500" />
            </div>
            <div className="text-xl font-semibold text-gray-200">On demand</div>
            <div className="mt-3 border-t border-white/10 pt-2 text-[8px] text-gray-600">BAN SNAPSHOT · MANUAL SYNC</div>
          </article>
          <article className="border border-white/10 bg-[#101014]/90 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-[0.18em] text-gray-500">Host telemetry</span>
              <Activity size={14} className="text-gray-500" />
            </div>
            <div className="text-xl font-semibold text-gray-400">Unavailable</div>
            <div className="mt-3 border-t border-white/10 pt-2 text-[8px] text-gray-600">CPU / MEMORY METRICS NOT EXPOSED</div>
          </article>
        </section>

        <section id="voice" className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-[#fb394f]">01</span>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">AI voice links</h2>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">{availableAssistantCount} assistants assigned</span>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {dashboard.modules?.realtimeAssistants?.planner && (
              <VoiceAssistantCard
                persona="planner"
                configured={dashboard.modules?.geminiConfigured}
                disabled={Boolean(activeVoicePersona && activeVoicePersona !== 'planner')}
                onActiveChange={setActiveVoicePersona}
                name="Planner"
                assistantId="AI-01 // EXECUTIVE"
                description="Strategic assistant for studio schedules, ShiftStream milestones, and task planning."
                tools="STUDIO TASKS + SCHEDULES"
              />
            )}
            {dashboard.modules?.realtimeAssistants?.tech_ops && (
              <VoiceAssistantCard
                persona="tech_ops"
                configured={dashboard.modules?.geminiConfigured}
                disabled={Boolean(activeVoicePersona && activeVoicePersona !== 'tech_ops')}
                onActiveChange={setActiveVoicePersona}
                name="Tech Ops"
                assistantId="AI-02 // CORE SYSTEMS"
                description="Technical systems specialist for server health, Supabase heartbeat, and infrastructure checks."
                tools="HEALTH + HEARTBEAT"
              />
            )}
            {!dashboard.modules?.realtimeAssistants?.planner && !dashboard.modules?.realtimeAssistants?.tech_ops && (
              <p className="border border-white/10 bg-[#101014]/90 p-5 text-[9px] leading-5 text-gray-500">No voice assistant is assigned to this Discord account. Ask an administrator to configure the per-assistant account allowlists.</p>
            )}
          </div>
          <p className="mt-3 text-[8px] leading-4 text-gray-600">Gemini Live (`gemini-3.8-live`) · one-use session tokens · 16 kHz input / 24 kHz output · 45-second silence disconnect.</p>
        </section>

        <section id="services" className="mt-8 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="border border-white/10 bg-[#101014]/90 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300"><span className="mr-2 text-[#fb394f]">02</span>Connected services</h2>
              <span className="text-[7px] uppercase tracking-widest text-gray-600">Verified sources only</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-white/5 py-3 text-[9px]">
              <span className="text-gray-300">Supabase heartbeat</span><span className={heartbeatStyle.className}>{heartbeatStyle.label}</span>
              <span className="mt-1 truncate text-[8px] text-gray-600">{formatTimestamp(heartbeat.lastSeenAt)}</span><span />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-white/5 py-3 text-[9px]">
              <span className="text-gray-300">Moderation archive</span><span className={archiveStatus === 'Connected' ? 'text-emerald-400' : 'text-amber-400'}>{archiveStatus}</span>
              <span className="mt-1 text-[8px] text-gray-600">Discord cases and ban snapshots</span><span />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-x-4 py-3 text-[9px]">
              <span className="text-gray-300">Local host / firewall</span><span className="text-gray-500">Not connected</span>
              <span className="mt-1 text-[8px] text-gray-600">No on-premises telemetry agent configured</span><span />
            </div>
          </article>
          <article className="border border-white/10 bg-[#101014]/90 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300"><span className="mr-2 text-[#fb394f]">03</span>Archive activity</h2>
              <span className="text-[7px] uppercase tracking-widest text-gray-600">Current query</span>
            </div>
            <div className="space-y-1">
              {recentArchiveCases.length ? recentArchiveCases.map((item) => (
                <div key={`${item.source_system}:${item.source_id}`} className="flex items-start gap-3 border-b border-white/5 py-2">
                  <span className="mt-0.5 border border-red-500/20 px-1 text-[7px] font-black text-red-300">M</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[8px] text-gray-300">{item.case_number ? `Case #${item.case_number}` : item.actions?.join(', ') || 'Moderation record'} · {item.target_username || 'Unknown account'}</span>
                    <span className="mt-1 block text-[7px] text-gray-600">{item.source_system.replaceAll('_', ' ')} · {formatTimestamp(item.occurred_at || item.synced_at)}</span>
                  </span>
                </div>
              )) : <p className="py-4 text-[9px] leading-5 text-gray-600">No matching archive records are available on this page.</p>}
            </div>
          </article>
        </section>

        <section id="engineering" className="mt-8">
          <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400"><span className="mr-2 text-[#fb394f]">04</span>Production tools</div>
          <div className="grid gap-3 lg:grid-cols-2">
            <article className="border border-white/10 bg-[#101014]/90 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <CalendarDays className="text-[#fb394f]" size={17} />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">App ready · setup required</span>
              </div>
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-100">ShiftStream</h2>
              <p className="mt-2 text-[9px] leading-5 text-gray-500">Private Next.js workspace for manager sign-in, Twitch schedule authorization, and idempotent Google Calendar sync.</p>
              {shiftStreamUrl ? (
                <a href={shiftStreamUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 border border-red-500/30 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-red-200 hover:bg-red-500/10">
                  Open ShiftStream <ExternalLink size={11} />
                </a>
              ) : (
                <p className="mt-4 text-[8px] leading-4 text-amber-300">Deploy the shiftstream/ app, then set VITE_SHIFTSTREAM_URL to its URL.</p>
              )}
            </article>
            {dashboard.modules?.videoEditorAccess && (
              <article className="border border-white/10 bg-[#101014]/90 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <Film className="text-[#fb394f]" size={17} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Role verified · local render</span>
                </div>
                <h2 className="text-xs font-black uppercase tracking-wide text-gray-100">Browser video editor</h2>
                <p className="mt-2 text-[9px] leading-5 text-gray-500">Standalone production workspace with multi-track editing, MP4 rendering, and local downloads.</p>
                <a href="/editor" className="mt-4 inline-flex items-center gap-2 border border-red-500/30 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-red-200 transition hover:bg-red-500/10">
                  Open editor <ExternalLink size={11} />
                </a>
              </article>
            )}
          </div>
        </section>

        <section id="moderation" className="mt-8 border border-red-500/20 bg-[#101014]/95 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-2 text-[8px] font-black uppercase tracking-[0.25em] text-[#fb394f]">Mods &amp; staff // private archive</div>
              <h2 className="text-base font-black uppercase tracking-wide text-gray-100">Moderation cases</h2>
            </div>
            <button type="button" onClick={handleTwitchSync} disabled={twitchSyncing || busy} className="inline-flex items-center gap-2 border border-purple-500/30 px-4 py-3 text-[8px] font-black uppercase tracking-[0.16em] text-purple-300 transition hover:bg-purple-500/10 disabled:opacity-50">
              <RefreshCw size={13} className={twitchSyncing ? 'animate-spin' : ''} /> Sync Twitch bans
            </button>
          </div>
          <p className="mb-4 text-[9px] leading-5 text-gray-500">
            Discord forum cases and current Discord bans sync from the bot. Twitch’s current ban list is refreshed on demand. Case data and copied evidence are stored in Supabase, independently of Discord.
          </p>
          {twitchSyncStatus && <p role="status" className="mb-4 border border-purple-500/20 bg-purple-500/5 p-3 text-[9px] text-purple-200">{twitchSyncStatus}</p>}
          <form onSubmit={handleCaseSearch} className="mb-4 flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-3 border border-white/10 bg-black/30 px-3 py-3">
              <Search size={13} className="shrink-0 text-gray-500" />
              <span className="sr-only">Search all moderation cases</span>
              <input value={caseSearch} maxLength={100} onChange={(event) => setCaseSearch(event.target.value)} placeholder="Search all archived cases, users, actions, evidence text…" className="w-full bg-transparent text-[9px] text-white outline-none placeholder:text-gray-600" />
            </label>
            <button type="submit" disabled={busy} className="border border-white/10 px-4 text-[8px] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-gray-500 disabled:opacity-50">Search</button>
          </form>
          <div className="space-y-2">
            {moderationCases.length ? moderationCases.map((item) => (
              <article key={`${item.source_system}:${item.source_id}`} className="border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[9px] font-black uppercase tracking-wide text-gray-100">
                      {item.case_number ? `Case #${item.case_number}` : item.actions?.join(', ') || 'Moderation record'}
                    </h3>
                    <p className="mt-2 text-[9px] text-gray-400">
                      {item.target_username || 'Unknown account'}{item.target_user_id ? ` · ${item.target_user_id}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(item.platforms || []).map((platform) => <span key={platform} className="border border-red-500/20 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-red-300">{platform}</span>)}
                    <span className="border border-white/10 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-gray-400">{item.status}</span>
                  </div>
                </div>
                {item.reason && <p className="mt-3 text-[9px] leading-5 text-gray-500">{item.reason}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[7px] uppercase tracking-widest text-gray-600">
                  <span>{item.source_system.replaceAll('_', ' ')}</span>
                  <span>{item.actions?.join(', ') || 'action unclassified'}</span>
                  <span>{formatTimestamp(item.occurred_at || item.synced_at)}</span>
                  {item.appeal_status && <span>Appeal: {item.appeal_status}</span>}
                  {(item.evidence || []).map((evidence) => evidence.status === 'stored' ? (
                    <a key={evidence.storagePath} href={`/api/vex-node/evidence?path=${encodeURIComponent(evidence.storagePath)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-300 hover:text-white">
                      <Download size={11} /> {evidence.filename}
                    </a>
                  ) : <span key={evidence.filename} className="text-amber-400">Evidence copy unavailable: {evidence.filename}</span>)}
                  {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gray-500 hover:text-white"><ExternalLink size={11} /> Source</a>}
                </div>
              </article>
            )) : <p className="border border-white/10 bg-black/20 p-4 text-[9px] text-gray-500">No matching moderation records have been imported yet.</p>}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <button type="button" onClick={() => handleCasePage(Math.max(0, caseOffset - 100))} disabled={caseOffset === 0 || busy} className="border border-white/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-gray-500 disabled:opacity-40">Previous</button>
            <span className="text-[8px] uppercase tracking-widest text-gray-600">Page {Math.floor(caseOffset / 100) + 1}</span>
            <button type="button" onClick={() => handleCasePage(caseOffset + 100)} disabled={!hasMoreCases || busy} className="border border-white/10 px-4 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-gray-500 disabled:opacity-40">Next</button>
          </div>
        </section>
      </div>
    </main>
  );
}
