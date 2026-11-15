import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Film, LogOut, ShieldCheck } from 'lucide-react';
import BrowserVideoEditor from './components/editor/BrowserVideoEditor';

export default function VideoEditorPage() {
  const [access, setAccess] = useState('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/vex-node/editor-access', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Unable to verify editor access.');
          setAccess(response.status === 401 ? 'signed-out' : response.status === 403 ? 'denied' : 'error');
          return;
        }
        setAccess('authorized');
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message || 'Unable to verify editor access.');
          setAccess('error');
        }
      }
    };

    checkAccess();
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
      setAccess('signed-out');
    } catch (logoutError) {
      setError(logoutError.message || 'Unable to end the VEX-NODE session.');
    } finally {
      setBusy(false);
    }
  };

  if (access !== 'authorized') {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#080505] px-5 py-14 font-mono text-gray-200 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.18),_transparent_55%)]" />
        <div className="relative mx-auto flex min-h-[75vh] max-w-3xl flex-col justify-center">
          <a href="/node" className="mb-12 inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 transition hover:text-white">
            <ArrowLeft size={14} /> VEX-NODE control panel
          </a>
          <div className="border border-red-600/25 bg-[#100909]/90 p-8 shadow-[0_0_70px_rgba(220,38,38,0.08)] sm:p-12">
            <div className="mb-7 flex h-12 w-12 items-center justify-center border border-red-500/30 bg-red-500/10 text-[#fb394f]">
              <ShieldCheck size={24} />
            </div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-[#fb394f]">VEXON POST // Restricted</div>
            <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tight text-white sm:text-5xl">Editor workspace</h1>
            <p className="mb-8 max-w-xl text-sm leading-7 text-gray-400">
              This standalone workspace is available only to Discord accounts with an assigned video editor role.
            </p>
            {access === 'loading' && <p className="mb-6 text-xs uppercase tracking-widest text-gray-500">Verifying editor role…</p>}
            {(error || access === 'denied') && (
              <div role="alert" className="mb-6 flex items-start gap-3 border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200">
                <AlertTriangle className="mt-1 shrink-0" size={16} />
                <span>{error || 'This Discord account does not have the video editor role.'}</span>
              </div>
            )}
            {access === 'signed-out' && (
              <a href="/api/vex-node/login" className="inline-flex items-center gap-3 bg-red-600 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black">
                <ShieldCheck size={16} /> Sign in with Discord
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08090b] font-mono text-gray-200">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(220,38,38,.13), transparent 35%), linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px)', backgroundSize: 'auto, 32px 32px, 32px 32px' }} />
      <div className="relative mx-auto max-w-[1480px] px-4 pb-12 pt-6 sm:px-7 lg:px-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <a href="/node" className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 transition hover:text-white">
            <ArrowLeft size={13} /> VEX-NODE control panel
          </a>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-emerald-300">
              <Film size={12} /> Private local render
            </span>
            <button type="button" onClick={handleLogout} disabled={busy} className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-gray-400 transition hover:text-white disabled:opacity-50">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </header>

        <section className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-red-500/20 px-1 py-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.25em] text-[#fb394f]">
              <Film size={12} /> VEXON POST-PRODUCTION // IN-HOUSE
            </div>
            <h1 className="text-lg font-black uppercase tracking-tight text-white sm:text-xl">Video editor</h1>
          </div>
          <p className="max-w-xl text-[8px] leading-4 text-gray-500">
            Edit, render, and download locally. Source media is never uploaded to VEX-NODE.
          </p>
        </section>

        {error && <div role="alert" className="mb-5 border border-red-500/30 bg-red-500/5 p-3 text-[9px] text-red-200">{error}</div>}
        <BrowserVideoEditor />
      </div>
    </main>
  );
}
