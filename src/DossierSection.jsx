import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, Sword, Target, Activity, Loader2 } from 'lucide-react';

const DossierSection = () => {
  const [activeTab, setActiveTab] = useState('subject');
  const [intel, setIntel] = useState([
    { agentId: 'V-01', message: 'PHONK_SYNC established in sector 4.', time: '14:20' },
    { agentId: 'HQ', message: 'Visor telemetry showing stable 144hz refresh.', time: '12:05' },
  ]);
  const [newIntel, setNewIntel] = useState('');

  const submitIntel = (e) => {
    e.preventDefault();
    if (!newIntel.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setIntel([{ agentId: 'GUEST', message: newIntel, time }, ...intel]);
    setNewIntel('');
  };

  return (
    <section className="rounded-3xl border border-red-600/30 bg-[#0d0707]/90 p-6 shadow-[0_0_40px_rgba(220,38,38,0.12)]">
      <div className="mb-8 flex flex-wrap border-b border-red-900/30">
        {[
          { id: 'subject', label: '01_Subject', icon: Target },
          { id: 'intel', label: '02_Field_Feed', icon: Radio },
          { id: 'combat', label: '03_Protocols', icon: Sword },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'text-gray-500 hover:bg-red-950/20'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'subject' && (
          <motion.div
            key="subject"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="border-l-4 border-red-600 bg-red-600/5 p-6">
              <h3 className="mb-2 text-2xl font-black uppercase italic text-white">Subject: V-01</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                Elite Protogen-class hybrid. Specialization:{' '}
                <span className="text-red-500">Urban Guerilla & Phonk-Rhythm Combat</span>.
                Exhibits high-response reflexes, low-latency sensory fusion, and a compulsive
                drive to optimize every frame of motion.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-red-600/20 bg-black/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-red-400">
                  <Activity size={16} />
                  <span className="text-xs font-semibold uppercase tracking-[0.3em]">Signal Profile</span>
                </div>
                <p className="text-sm text-gray-300">
                  Stable on 144Hz, rapid mood-state shifts under pressure, and an unshakable focus on tempo.
                </p>
              </div>
              <div className="rounded-2xl border border-red-600/20 bg-black/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-red-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-semibold uppercase tracking-[0.3em]">Core State</span>
                </div>
                <p className="text-sm text-gray-300">
                  Ready for live deployment, cross-platform orchestration, and high-impact creator collaborations.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'intel' && (
          <motion.div
            key="intel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <form onSubmit={submitIntel} className="rounded-2xl border border-red-600/20 bg-black/30 p-4">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
                New field report
              </label>
              <textarea
                value={newIntel}
                onChange={(e) => setNewIntel(e.target.value)}
                className="min-h-[90px] w-full rounded-xl border border-red-600/20 bg-[#120707] px-3 py-2 text-sm text-white outline-none ring-0"
                placeholder="Drop a new signal, note, or sync point..."
              />
              <button
                type="submit"
                className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-red-500"
              >
                Upload Intel
              </button>
            </form>

            <div className="space-y-3">
              {intel.map((entry, index) => (
                <div key={`${entry.agentId}-${index}`} className="rounded-2xl border border-red-600/20 bg-[#120707] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{entry.agentId}</span>
                    <span className="text-xs uppercase tracking-[0.25em] text-gray-500">{entry.time}</span>
                  </div>
                  <p className="text-sm text-gray-300">{entry.message}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'combat' && (
          <motion.div
            key="combat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="rounded-2xl border border-red-600/20 bg-black/30 p-5">
              <h4 className="mb-3 text-lg font-black uppercase text-white">Protocol Stack</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Phase-lock visual identity across every stream and launch.</li>
                <li>• Maintain a strict cadence of live drops, updates, and community rituals.</li>
                <li>• Prioritize cinematic motion, clear signal, and relentless momentum.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default DossierSection;
