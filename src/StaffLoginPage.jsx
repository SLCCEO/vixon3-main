import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function StaffLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070708] px-5 py-16 font-mono text-gray-200 selection:bg-red-600 selection:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background:linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%),linear-gradient(90deg,rgba(255,0,0,0.08),rgba(0,255,0,0.02),rgba(0,0,255,0.08))] [background-size:100%_3px,4px_100%]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-[120px]" />

      <section className="relative w-full max-w-xl border border-red-600/30 bg-[#0b090b]/95 p-7 shadow-[0_0_80px_rgba(127,29,29,0.14)] sm:p-10">
        <a
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 transition hover:text-white"
        >
          <ArrowLeft size={14} /> Return to VexonStudio
        </a>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center border border-red-500/40 bg-red-950/40 text-red-400">
            <ShieldCheck size={21} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-red-400">VEX-NODE // ACCESS GATE</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-gray-600">Staff and editor authentication</p>
          </div>
        </div>

        <h1 className="text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
          Control panel
          <span className="mt-1 block text-red-500">sign in</span>
        </h1>
        <p className="mt-5 text-sm leading-7 text-gray-400">
          Continue with the Discord account connected to your VEXON server membership. Access is granted only to accounts with an authorized staff, moderator, or editor role.
        </p>

        <a
          href="/api/vex-node/login"
          className="mt-8 inline-flex w-full items-center justify-center gap-3 bg-red-600 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black"
        >
          <LockKeyhole size={15} /> Continue with Discord <ArrowUpRight size={14} />
        </a>

        <div className="mt-7 border-t border-white/10 pt-5 text-[10px] leading-6 text-gray-600">
          <p>Discord sign-in verifies your account; it does not grant access by itself.</p>
          <p>Staff access is checked against server roles. Editor-only accounts are limited to the video editor.</p>
        </div>

        <a
          href="/node"
          className="mt-6 inline-flex text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500 transition hover:text-red-300"
        >
          Already signed in? Open VEX-NODE <ArrowUpRight className="ml-2" size={12} />
        </a>
      </section>
    </main>
  );
}
