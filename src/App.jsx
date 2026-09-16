import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Twitter, 
  Twitch, 
  Youtube, 
  Instagram, 
  Music, 
  Mail, 
  Play, 
  Pause,
  ChevronRight,
  Menu,
  X,
  Zap,
  Cpu,
  Terminal,
  Shield,
  Sword,
  Radio,
  MessageSquare,
  Video,
  Send,
  Sparkles,
  Loader2,
  RefreshCw,
  Activity,
  FileText,
  Target,
  BookOpen,
  Handshake,
  Users2,
  CalendarDays,
  Store,
  BadgeCheck,
  ExternalLink,
  Crown,
  UserRound,
  LockKeyhole
} from 'lucide-react';

// --- Gemini API Logic ---
const getApiKey = () => {
  try {
    return (
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || 
      (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) || 
      ""
    );
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const liveDataRefreshMs = 5 * 60 * 1000;

const fetchLiveData = (endpoint, signal) => fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}_=${Date.now()}`, {
  cache: 'no-store',
  headers: { Accept: 'application/json' },
  signal,
});

const parseCount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toCompactNumber = (value) => {
  if (value === null || value === undefined) return '—';
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return `${value}`;
};

async function callGemini(prompt, systemInstruction = "") {
  if (!apiKey) {
    console.error("Gemini API key missing");
    return "ERROR: NEURAL_LINK_OFFLINE.";
  }

  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3-flash',
    'gemini-2.5-flash-lite'
  ];

  const payloadBase = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  if (systemInstruction) {
    payloadBase.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const parseResult = (result) => {
    return (
      result?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text ||
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.candidates?.[0]?.message?.content?.[0]?.text ||
      result?.output?.[0]?.content?.[0]?.text ||
      result?.text ||
      null
    );
  };

  const tryModel = async (model) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBase)
    });
    const result = await response.json();
    return { response, result, model, url };
  };

  let lastError = 'NO_RESPONSE';

  for (const model of models) {
    try {
      const { response, result, url } = await tryModel(model);
      if (!response.ok) {
        const message = result.error?.message || result.error?.status || JSON.stringify(result);
        console.warn(`Gemini ${model} failed:`, message, url);
        lastError = message || lastError;
        continue;
      }

      const text = parseResult(result);
      if (text) return text;

      lastError = result.error?.message || 'NO_RESPONSE';
      console.warn(`Gemini ${model} returned no text`, result, url);
    } catch (error) {
      console.error('Gemini request failed', error);
      lastError = `UPLINK_ERROR: ${error.message}`;
    }
  }

  return lastError;
}

// --- Components ---

const DossierSection = () => {
  const [activeTab, setActiveTab] = useState('subject');
  const [intel, setIntel] = useState([
    { agentId: 'V-01', message: 'PHONK_SYNC established in sector 4.', time: '14:20' },
    { agentId: 'HQ', message: 'Visor telemetry showing stable 144hz refresh.', time: '12:05' }
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
    <div className="bg-[#0d0707] border-2 border-red-600/30 p-1 md:p-6 shadow-2xl">
      <div className="flex flex-wrap border-b border-red-900/30 mb-8">
        {[
          { id: 'subject', label: '01_Subject', icon: Target },
          { id: 'intel', label: '02_Field_Feed', icon: Radio },
          { id: 'combat', label: '03_Protocols', icon: Sword },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-gray-500 hover:bg-red-950/20'}`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'subject' && (
          <motion.div key="subject" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 border-l-4 border-red-600 bg-red-600/5">
                <h3 className="text-2xl font-black text-white italic uppercase mb-2">Subject: V-01</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Elite Protogen-class hybrid. Specialization: <span className="text-red-500">Urban Guerilla & Phonk-Rhythm Combat</span>. 
                  Exhibits high-frequency aura and sword mastery. Internal lie-detection algorithms trigger aggressive protocols upon deception.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-gray-800 p-4">
                  <div className="text-[10px] text-red-600 font-black mb-1">SPD</div>
                  <div className="h-1 w-full bg-gray-900"><div className="h-full bg-red-600 w-[98%] shadow-[0_0_10px_#dc2626]"></div></div>
                </div>
                <div className="bg-black/40 border border-gray-800 p-4">
                  <div className="text-[10px] text-red-600 font-black mb-1">PWR</div>
                  <div className="h-1 w-full bg-gray-900"><div className="h-full bg-red-600 w-[85%] shadow-[0_0_10px_#dc2626]"></div></div>
                </div>
                <div className="bg-black/40 border border-gray-800 p-4">
                  <div className="text-[10px] text-red-600 font-black mb-1">HCK</div>
                  <div className="h-1 w-full bg-gray-900"><div className="h-full bg-red-600 w-[92%] shadow-[0_0_10px_#dc2626]"></div></div>
                </div>
                <div className="bg-black/40 border border-gray-800 p-4">
                  <div className="text-[10px] text-red-600 font-black mb-1">RGE</div>
                  <div className="h-1 w-full bg-gray-900"><div className="h-full bg-red-600 w-[100%] shadow-[0_0_10px_#dc2626]"></div></div>
                </div>
              </div>
            </div>
            <div className="bg-red-900/10 border border-red-600/30 p-8 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 border-2 border-red-600 rotate-45 mb-6 flex items-center justify-center">
                  <span className="text-3xl font-black text-red-600 -rotate-45">S+</span>
                </div>
                <h4 className="text-white font-black italic uppercase">Combat_Grade</h4>
                <p className="text-[9px] text-red-700 tracking-[.3em] uppercase mt-2">Hazard: Critical</p>
            </div>
          </motion.div>
        )}

        {activeTab === 'intel' && (
          <motion.div key="intel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {intel.map((log, i) => (
                <div key={i} className="p-4 bg-red-900/5 border border-red-900/20">
                  <div className="flex justify-between text-[8px] font-black text-red-800 uppercase mb-2">
                    <span>AGENT_{log.agentId}</span>
                    <span>{log.time}</span>
                  </div>
                  <p className="text-xs text-gray-300">{log.message}</p>
                </div>
              ))}
            </div>
            <form onSubmit={submitIntel} className="space-y-4">
              <textarea 
                value={newIntel}
                onChange={(e) => setNewIntel(e.target.value)}
                placeholder="TRANSMIT_INTEL..."
                className="w-full bg-black border border-gray-800 p-4 text-xs text-white h-32 focus:border-red-600 outline-none"
              />
              <button className="w-full bg-red-600 text-white font-black py-4 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                Execute_Transmission
              </button>
            </form>
          </motion.div>
        )}

        {activeTab === 'combat' && (
          <motion.div key="combat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-6 bg-white/5 border border-red-900/20 p-6">
              <Activity className="text-red-600" size={40} />
              <div>
                <h4 className="text-xl font-black text-white italic uppercase">Katana Sync Protocol</h4>
                <p className="text-xs text-gray-500 max-w-xl">Blades vibrate at high-frequency synchronized to Phonk BPM. Atomic-level shearing capacity on Aegis-grade plating.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['GLITCH_DASH', 'CRIMSON_VISOR', 'RHYTHM_PARRY'].map(m => (
                <div key={m} className="p-4 bg-black border border-gray-900 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-bold">{m}</span>
                  <span className="text-[9px] text-red-600 font-black animate-pulse">ONLINE</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ currentPath, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoClicks = useRef(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = () => {
    logoClicks.current += 1;
    if (logoClicks.current >= 5) {
      logoClicks.current = 0;
      onNavigate('/neural-override');
    }
    window.setTimeout(() => {
      logoClicks.current = 0;
    }, 1400);
  };

  const handleNavClick = (e, target) => {
    if (target.startsWith('#')) {
      e.preventDefault();
      if (currentPath !== '/') {
        onNavigate('/');
        setTimeout(() => {
          const targetElement = document.querySelector(target);
          targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      } else {
        const targetElement = document.querySelector(target);
        targetElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setMobileMenuOpen(false);
      return;
    }

    e.preventDefault();
    onNavigate(target);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Live', href: '#live' },
    { name: 'Dossier', href: '#dossier' },
    { name: 'Lore', href: '/lore' },
    { name: 'Streamers', href: '/streamers' },
    { name: 'Partners', href: '/partnerships' },
    { name: 'Staff', href: '/staff' },
    { name: 'Patreon', href: '/patreon' },
    { name: 'Archives', href: '#archives' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0a0505]/95 backdrop-blur-md py-3 border-b border-red-600/30' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          onClick={handleLogoClick}
          role="button"
          tabIndex={0}
          title="VEXON_SYS"
          className="text-2xl font-black tracking-tighter text-red-500 italic flex items-center gap-2"
        >
          <img src="/vexon-logo.png" alt="Vexon Studios" className="h-9 w-9 object-cover mix-blend-multiply" />
          VEXON_SYS
        </motion.div>

        <div className="hidden md:flex space-x-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className="text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest text-xs transition-colors">
              [{link.name}]
            </a>
          ))}
        </div>

        <button className="md:hidden text-red-500" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#0a0505] border-b border-red-600/50 overflow-hidden"
          >
            <div className="flex flex-col p-6 space-y-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-lg font-bold text-gray-300 hover:text-red-500 uppercase tracking-tighter"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const DiskReel = ({ title, type, color }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex flex-col items-center group">
      <div className="relative w-48 h-48 md:w-56 md:h-56">
        <motion.div 
          animate={{ rotate: isPlaying ? 360 : 0 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className={`w-full h-full rounded-full border-4 border-red-900 shadow-[0_0_40px_rgba(220,38,38,0.2)] relative overflow-hidden bg-black flex items-center justify-center`}
        >
          <div className="absolute inset-0 opacity-40 border-[1px] border-red-500 rounded-full scale-95 border-dashed"></div>
          <div className="absolute inset-0 opacity-10 border-[20px] border-white rounded-full scale-75"></div>
          <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center z-10 border-2 border-red-500 bg-gradient-to-br ${color} shadow-[0_0_25px_rgba(220,38,38,0.6)]`}>
             <Music size={24} className="text-white mb-1" />
          </div>
        </motion.div>

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center bg-red-600/0 group-hover:bg-red-600/20 transition-all rounded-full"
        >
          <div className="bg-red-600 p-4 rounded-none shadow-[0_0_20px_#dc2626] transform scale-0 group-hover:scale-100 transition-all duration-300 hover:scale-110">
            {isPlaying ? <Pause className="text-white fill-current" /> : <Play className="text-white fill-current" />}
          </div>
        </button>
      </div>
      <div className="mt-6 text-center">
        <h3 className="text-xl font-black text-white tracking-tighter uppercase italic group-hover:text-red-500 transition-colors">{title}</h3>
        <p className="text-red-900 uppercase tracking-[0.3em] text-[10px] font-bold mt-1">{type}</p>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.05 }}
    className="bg-[#120a0a] border-b-4 border-red-600 p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 p-1 opacity-20"><Cpu size={12}/></div>
    <div className="p-3 mb-4 rounded-full bg-red-600/10 text-red-500 transition-all group-hover:shadow-[0_0_20px_#dc2626]">
      <Icon size={24} />
    </div>
    <span className="text-3xl font-black text-white tracking-tighter">{value}</span>
    <span className="text-[10px] font-black text-red-700 mt-1 uppercase tracking-[0.2em]">{label}</span>
  </motion.div>
);

const NeuralOverridePage = ({ onNavigate }) => {
  const [phase, setPhase] = useState('login');
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    const hackTimer = window.setTimeout(() => setPhase('hack'), 4000);
    const loreTimer = window.setTimeout(() => setPhase('lore'), 9000);
    return () => {
      window.clearTimeout(hackTimer);
      window.clearTimeout(loreTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'hack') return undefined;
    const downloadTimer = window.setInterval(() => {
      setDownloadProgress((progress) => Math.min(progress + 5, 100));
    }, 240);
    return () => window.clearInterval(downloadTimer);
  }, [phase]);

  return (
    <div className="min-h-screen bg-black px-6 py-24 text-gray-200">
      <div className="mx-auto max-w-5xl">
        {phase === 'login' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-md border border-red-600/50 bg-[#0d0707] p-8 shadow-[0_0_40px_rgba(220,38,38,0.2)]">
            <div className="mb-8 flex items-center justify-between border-b border-red-600/20 pb-4 text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
              <span>Aegis Corporation</span><span>Secure Login</span>
            </div>
            <div className="mb-8 text-center">
              <img src="/vexon-logo.png" alt="Vexon Studios" className="mx-auto mb-5 h-28 w-28 object-cover mix-blend-multiply" />
              <h1 className="text-2xl font-black uppercase italic text-white">Aegis Network</h1>
              <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">Authorized personnel only</p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="border border-gray-800 bg-black p-3 text-gray-500">USER_ID: V-01</div>
              <div className="border border-gray-800 bg-black p-3 text-gray-500">ACCESS_KEY: ************</div>
              <div className="flex items-center gap-2 border border-red-600/30 bg-red-600/10 p-3 text-red-400"><Loader2 size={14} className="animate-spin" /> Verifying neural signature...</div>
            </div>
          </motion.div>
        )}

        {phase === 'hack' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-red-600 bg-[#080404] p-8 shadow-[0_0_50px_rgba(220,38,38,0.25)]">
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-red-600/30 pb-4 text-red-500"><div className="flex items-center gap-3"><Terminal size={20} /><span className="text-xs font-black uppercase tracking-[0.3em]">NEURAL_LINK OVERRIDE</span></div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Packet {String(Math.min(downloadProgress + 1, 100)).padStart(3, '0')}</span></div>
            <div className="space-y-3 text-sm leading-7 text-red-400">
              {['AEGIS_AUTHORITY: REJECTED', 'V-01_SIGNATURE: RECOGNIZED', 'SECURITY_BULKHEADS: BREACHED'].map((message, index) => (
                <motion.p key={message} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.18 }}>&gt; {message}</motion.p>
              ))}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="border border-red-600/30 bg-red-600/5 p-4">
                <div className="mb-2 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-[0.18em] text-white"><span>Downloading: aegis_lore.pkg</span><span>{Math.min(downloadProgress, 100)}%</span></div>
                <div className="mb-3 flex h-3 gap-1 overflow-hidden bg-red-950 p-0.5">{Array.from({ length: 16 }, (_, index) => <motion.span key={index} animate={{ opacity: downloadProgress >= (index + 1) * 6.25 ? 1 : 0.25 }} className="h-full flex-1 bg-red-600" />)}</div>
                <div className="flex flex-wrap justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-red-300"><span>{Math.floor(512 + downloadProgress * 42.4)} KB / 4.76 MB</span><span>CRC: {downloadProgress > 70 ? '7A-04-OK' : 'CHECKING'}</span></div>
              </motion.div>
              <p className="animate-pulse text-white">&gt; DECODING CLASSIFIED LORE...</p>
            </div>
          </motion.div>
        )}

        {phase === 'lore' && (
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="border border-red-600/40 bg-[#0d0707] p-8 shadow-[0_0_40px_rgba(220,38,38,0.15)] md:p-12">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-red-600/20 pb-5"><div><div className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Recovered File // AEGIS-04</div><h1 className="text-4xl font-black uppercase italic text-white">The Override</h1></div><span className="border border-red-600/40 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Classified</span></div>
            <div className="space-y-6 text-sm leading-7 text-gray-300">
              <p>Deep beneath the fractured world, the Aegis Complex was built to fuse organic biology with cybernetic warfare. In C-Wing, Unit V-01 was engineered to move through glitch-heavy neural networks and corridors with equal lethality.</p>
              <p>Dr. Aris Thorne was the one technician who treated Vexon as more than a weapon. She introduced him to rhythm, freedom, and truth. When officials framed her for treason and cornered her in Sector 4, Vexon broke through the security bulkheads, but arrived too late.</p>
              <p className="border-l-4 border-red-600 bg-red-600/5 p-5 text-white">The death shattered his visor and turned his love of rhythm into a violent, glitching roar. The Aegis Complex did not lose a weapon that night. It created a witness.</p>
              <p>Now Vexon hunts liars, betrayals, and anyone who weaponizes secrets. Every stream, signal, and transmission is another breach in the system that tried to erase the truth.</p>
            </div>
            <button onClick={() => onNavigate('/')} className="mt-8 border border-red-600/40 bg-red-600/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600 hover:text-white">Return to surface</button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const PolicyPage = ({ type, onNavigate }) => {
  const isPrivacy = type === 'privacy';
  return (
    <div className="min-h-screen bg-[#0a0505] px-6 pb-24 pt-32 text-gray-200">
      <div className="mx-auto max-w-4xl">
        <button onClick={() => onNavigate('/')} className="mb-10 border border-red-600/30 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/10 hover:text-white">Return Home</button>
        <article className="border border-red-600/20 bg-[#0d0707] p-8 shadow-[0_0_30px_rgba(220,38,38,0.08)] md:p-12">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">VEXON_SYS // Official Document</div>
          <h1 className="mb-3 text-4xl font-black uppercase italic tracking-tight text-white">{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
          <p className="mb-10 text-xs uppercase tracking-[0.2em] text-gray-500">Effective date: September 15, 2026</p>
          {isPrivacy ? (
            <div className="space-y-7 text-sm leading-7 text-gray-300">
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Information we collect</h2><p>VEXON may receive information you voluntarily provide through contact forms or service integrations. The website may also receive public statistics from Twitch, YouTube, TikTok, Discord, and Patreon through their official APIs.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">How information is used</h2><p>Information is used to operate the website, display public creator and community statistics, respond to inquiries, support creator partnerships, and maintain site security. We do not sell personal information.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Platform integrations</h2><p>Twitch data is used for streamer profiles, channel links, live embeds, and follower totals. YouTube data is used to display the official channel subscriber count. TikTok data is used to display the official account follower count. Discord data is used to display an approximate server member count. Patreon data is used to display active supporter names when the creator feed is authorized. These integrations are read-only and only return the information needed for the website feature.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Third-party links</h2><p>Links may connect to Twitch, YouTube, TikTok, Discord, Patreon, Dubby, X, Instagram, and other third-party services. Dubby links may use referral tracking for the VexonCore discount partnership. Their own privacy policies and terms apply when you use those services.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Data security and retention</h2><p>API credentials are stored server-side and are not intentionally exposed in the browser. Information is retained only as needed to operate the website, provide requested services, and meet legal obligations.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Contact</h2><p>For privacy questions, contact <a className="text-red-400 hover:text-white" href="mailto:contact@vixon.online">contact@vixon.online</a>.</p></section>
            </div>
          ) : (
            <div className="space-y-7 text-sm leading-7 text-gray-300">
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Use of the website</h2><p>VEXON provides creator, streaming, technology, partnership, and community content. You agree to use this website lawfully and respectfully.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Content and ownership</h2><p>Unless otherwise noted, VEXON branding, original writing, software, graphics, videos, and other site content belong to VEXON or its licensors. Do not copy, redistribute, or commercially use site content without permission.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Connected services</h2><p>The website may connect to Twitch, YouTube, TikTok, Discord, Patreon, Dubby, X, and Instagram for channel links, live content, public statistics, supporter information, community access, and partner offers. These services are operated by separate companies and have their own terms and policies.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Disclaimer</h2><p>The website and its content are provided for informational and entertainment purposes. Features may change or become unavailable without notice.</p></section>
              <section><h2 className="mb-2 text-xl font-black uppercase text-white">Contact</h2><p>For business or legal questions, contact <a className="text-red-400 hover:text-white" href="mailto:contact@vixon.online">contact@vixon.online</a>.</p></section>
            </div>
          )}
        </article>
      </div>
    </div>
  );
};

const LorePage = ({ onNavigate }) => (
  <div className="pt-32 pb-24">
    <section className="py-20 border-b border-red-600/10 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_60%)]">
      <div className="container mx-auto px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Project VEXON</div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Unit V-01</h1>
          </div>
          <button onClick={() => onNavigate('/')} className="rounded border border-red-600/30 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/10 hover:text-white">
            Return Home
          </button>
        </div>

        <div className="rounded border border-red-600/20 bg-[#0d0707] p-8 shadow-[0_0_30px_rgba(220,38,38,0.08)]">
          <div className="mb-6 flex items-center gap-3">
            <BookOpen className="text-red-500" size={20} />
            <h2 className="text-2xl font-black uppercase italic text-white">Vexon • Classified Mythos</h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 text-sm leading-7 text-gray-300">
              <div className="rounded border border-red-600/20 bg-black/30 p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">The Origin</div>
                <p>
                  Deep beneath the fractured world lies the Aegis Complex, a sprawling underground government facility dedicated to the fusion of organic biology and cybernetic warfare. Vexon was engineered in C-Wing, designed to navigate the complex’s glitch-heavy neural networks and corridors with equal lethality.
                </p>
              </div>

              <div className="rounded border border-red-600/20 bg-black/30 p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">The Bond</div>
                <p>
                  During development, Vexon was assigned to Dr. Aris Thorne, the one technician who treated him as more than a weapon. She introduced him to Glitch-Phonk streams, taught him about birthdays, freedom, and truth, and became his true pack.
                </p>
              </div>

              <div className="rounded border border-red-600/20 bg-black/30 p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">The Betrayal</div>
                <p>
                  When a data leak was covered up, Vexon watched as the officials framed Aris for treason and cornered her in Sector 4. He broke through security bulkheads, but arrived too late. Her death shattered his visor and twisted his love of rhythm into a violent, glitching roar.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded border border-red-600/20 bg-black/30 p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">The Great Escape</div>
                <p className="text-sm leading-7 text-gray-300">
                  After the massacre in Sector 4, Vexon vanished. He overrode the ventilation gates, tore through security systems, and escaped to the surface, where the Aegis Complex became his hunting ground.
                </p>
              </div>

              <div className="rounded border border-red-600/20 bg-black/30 p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">The Code of Honor</div>
                <p className="text-sm leading-7 text-gray-300">
                  He now hunts liars, betrayals, and those who weaponize secrets. He protects the innocent and ensures the reach of the Complex never steals their freedom again.
                </p>
              </div>

              <div className="rounded border border-red-600/20 bg-black/30 p-5">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Combat & Capabilities</div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• The Red-Sun Katana: high-frequency blade that slices reinforced bulkheads.</li>
                  <li>• Combat Rhythm: phonk beats sync his strikes to impossible timing.</li>
                  <li>• Circuitry Overlay: glowing lines vent heat during overclocked combat.</li>
                  <li>• The Red Pulse: betrayal triggers a violent visor flare and vengeance mode.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const streamerProfiles = [
  { name: 'Lady Chaos', login: 'ladychaosvtuber', platform: 'Streamer', handle: '@ladychaosvtuber', bio: 'Embracing chaos as a variety streamer deity, I delve into any game or stream that piques my interest. Often found exploring the spooky realms with Dixper by my side, I also enjoy the occasional cozy game stream. Join me for a whirlwind of gaming adventures!', url: 'https://www.twitch.tv/ladychaosvtuber/about' },
  { name: 'Chloë Panzer', login: 'chloepanzer', platform: 'Streamer', handle: '@chloepanzer', bio: "Hey, lovelies. I'm Chloë (umlaut optional), a little cat who loves weapons and military vehicles.", url: 'https://www.twitch.tv/chloepanzer' },
  { name: 'Skylord3098', login: 'skylord2098', platform: 'Streamer', handle: '@skylord2098', bio: "Hey I'm Skylord, your Texan timelord. I stream on Twitch every Friday and Saturday at 7:00pm CST.", url: 'https://www.twitch.tv/skylord2098' },
  { name: 'Zephie', login: 'zephiezephira', platform: 'Streamer', handle: '@zephiezephira', bio: 'Hi, I\'m Zephie, and I\'m a beginner vtuber! I\'m a variety streamer who enjoys community interaction. I have two requests for you: please be kind to me and other viewers, and have fun! Thanks!♡', url: 'https://www.twitch.tv/zephiezephira' },
  { name: 'duhgobby', login: 'duhgobby', platform: 'Streamer', handle: '@duhgobby', bio: 'Just a damn goblin playing dumb games.', url: 'https://www.twitch.tv/duhgobby' },
  { name: 'deelexic', login: 'deelexic', platform: 'Streamer', handle: '@deelexic', bio: "Heya! I'm Dee Lex (ic is silent lol). I sometimes chat, very chill and laidback streams. Stay for a fun time not a long time ;3", url: 'https://www.twitch.tv/deelexic' },
];

const StreamersPage = ({ onNavigate }) => {
  const [twitchProfiles, setTwitchProfiles] = useState({});
  const [twitchStatus, setTwitchStatus] = useState('Syncing Twitch data');

  useEffect(() => {
    let isActive = true;
    let controller;
    const loadTwitchProfiles = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetchLiveData('/api/twitch', controller.signal);
        if (!response.ok) throw new Error('Twitch data unavailable');
        const { streamers = [] } = await response.json();
        if (!isActive) return;
        setTwitchProfiles(Object.fromEntries(streamers.map((streamer) => [streamer.login, streamer])));
        setTwitchStatus('Twitch data synced');
      } catch (error) {
        if (error.name !== 'AbortError' && isActive) setTwitchStatus('Twitch API setup required');
      }
    };
    const refreshOnFocus = () => { if (!document.hidden) loadTwitchProfiles(); };
    loadTwitchProfiles();
    const interval = window.setInterval(loadTwitchProfiles, liveDataRefreshMs);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      isActive = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  return (
  <div className="pt-32 pb-24">
    <section className="py-20 border-b border-red-600/10 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_60%)]">
      <div className="container mx-auto px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Creator Circle</div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Streamers_Page</h1>
          </div>
          <button onClick={() => onNavigate('/')} className="rounded border border-red-600/30 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/10 hover:text-white">
            Return Home
          </button>
        </div>

        <div className="rounded border border-red-600/20 bg-[#0d0707] p-8 shadow-[0_0_30px_rgba(220,38,38,0.08)]">
          <div className="mb-6 flex items-center gap-3">
            <Users2 className="text-red-500" size={20} />
            <h2 className="text-2xl font-black uppercase italic text-white">Streamer Dedication</h2>
            <span className="ml-auto text-right text-[9px] font-black uppercase tracking-[0.15em] text-red-400">{twitchStatus}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {streamerProfiles.map((streamer, index) => {
              const twitchProfile = twitchProfiles[streamer.login];
              return (
              <article key={`${streamer.name}-${index}`} className="group border border-red-600/20 bg-gradient-to-br from-red-600/10 to-black/30 p-6 transition hover:-translate-y-1 hover:border-red-500/60">
                <div className="mb-8 flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-red-600/40 bg-black/40 text-red-400">{twitchProfile?.profileImageUrl ? <img src={twitchProfile.profileImageUrl} alt="" className="h-full w-full object-cover" /> : <Users2 size={20} />}</div><span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">0{index + 1}</span></div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-400">{streamer.platform}</div>
                <h3 className="mb-2 text-xl font-black uppercase italic text-white">{streamer.name}</h3>
                <p className="mb-6 text-xs text-gray-500">{streamer.handle}</p>
                <p className="mb-6 min-h-10 text-sm leading-6 text-gray-300">{streamer.bio}</p>
                <div className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400"><Twitch size={14} /> {twitchProfile?.followers === null || twitchProfile?.followers === undefined ? 'Followers unavailable' : `${toCompactNumber(twitchProfile.followers)} followers`}</div>
                <a href={streamer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 transition group-hover:text-white">View Twitch channel <ExternalLink size={14} /></a>
              </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  </div>
  );
};

const PartnershipsPage = ({ dubbyLink, dubbyCouponCode, onNavigate }) => (
  <div className="pt-32 pb-24">
    <section className="py-20 border-b border-red-600/10 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_60%)]">
      <div className="container mx-auto px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">VEXON Network</div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Partnerships_Page</h1>
          </div>
          <button onClick={() => onNavigate('/')} className="rounded border border-red-600/30 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/10 hover:text-white">
            Return Home
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded border border-red-600/20 bg-[#0d0707] p-8 shadow-[0_0_30px_rgba(220,38,38,0.08)]">
            <div className="mb-6 flex items-center gap-3">
              <Handshake className="text-red-500" size={20} />
              <h2 className="text-2xl font-black uppercase italic text-white">Official Partner Layer</h2>
            </div>
            <p className="text-sm leading-7 text-gray-300">
              This is the dedicated VEXON partner hub. It collects sponsorship activations, brand collaborations, creator campaigns, and event-based alliances in one place so the network feels like its own ecosystem.
            </p>
            <div className="mt-6 rounded border border-red-600/20 bg-gradient-to-br from-red-600/10 to-black/30 p-5">
              <div className="mb-3 flex items-center gap-2 text-red-400">
                <BadgeCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Official Dubby Partnership</span>
              </div>
              <h3 className="mb-2 text-2xl font-black uppercase italic text-white">Dubby Brand • Collab Series</h3>
              <p className="text-sm leading-7 text-gray-300">
                High-voltage stream moments, limited drops, and creator-led activations built around the same neon-edge energy as VEXON. Use my Discount Code for 10% OFF any Product for Dubby: VexonCore.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <a href={dubbyLink} target="_blank" rel="noreferrer" className="rounded border border-red-600/30 bg-red-600/10 px-4 py-3 text-sm font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/20 hover:text-white">
                  Open Dubby Link
                </a>
                <div className="rounded border border-red-600/20 bg-black/30 px-4 py-3 text-sm font-black uppercase tracking-[0.25em] text-white">
                  Code: {dubbyCouponCode}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded border border-red-600/20 bg-[#0d0707] p-8">
              <div className="mb-6 flex items-center gap-3">
                <Users2 className="text-red-500" size={20} />
                <h2 className="text-xl font-black uppercase italic text-white">Alliance Types</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-3 rounded border border-red-600/20 bg-black/30 p-3"><CalendarDays size={16} className="text-red-500" /> Stream collabs, launch nights, and event partnerships.</div>
                <div className="flex items-center gap-3 rounded border border-red-600/20 bg-black/30 p-3"><Store size={16} className="text-red-500" /> Merch drops, supporters perks, and exclusive access.</div>
                <div className="flex items-center gap-3 rounded border border-red-600/20 bg-black/30 p-3"><Shield size={16} className="text-red-500" /> Trusted sponsor systems with clear creative standards.</div>
              </div>
            </div>
            <div className="rounded border border-red-600/20 bg-[#0d0707] p-8">
              <div className="mb-4 flex items-center gap-2 text-red-400">
                <Sparkles size={18} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Partner Pitch</span>
              </div>
              <h2 className="mb-4 text-3xl font-black uppercase italic text-white">Partner with VEXON</h2>
              <p className="mb-4 text-sm leading-7 text-gray-300">
                VEXON is a tech-driven VTuber, web developer, IT specialist, and game developer delivering high-octane broadcasts, sharp visuals, and an active, hyper-engaged Twitch audience. Powered by a dedicated staff team, VEXON blends interactive gaming, technology, and custom digital builds into a unique live experience.
              </p>
              <p className="mb-6 text-sm leading-7 text-gray-300">
                Whether you are a tech brand, software provider, hardware manufacturer, or fellow creator, partnering with VEXON puts your product in front of a smart, tech-savvy, and interactive community.
              </p>

              <h3 className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-red-400">Why work with VEXON?</h3>
              <div className="space-y-3 text-sm leading-6 text-gray-300">
                <div><strong className="text-white">Tech &amp; Dev Ecosystem</strong><br />As an active developer and IT specialist, VEXON speaks the language of tech natively. Audience integrations feel authentic, informed, and genuinely engaging.</div>
                <div><strong className="text-white">Dedicated Production &amp; Staff Support</strong><br />Work with an organized, staff-backed pipeline built around clear communication, structured execution, and reliable sponsored delivery.</div>
                <div><strong className="text-white">Hyper-Interactive Audience</strong><br />Streams thrive on real-time conversation, technical discussion, and direct audience interaction that drives clicks and community participation.</div>
                <div><strong className="text-white">Custom Stream Integrations</strong><br />Custom web widgets, live overlays, and tailored hardware or software showcases are built cleanly into the broadcast setup.</div>
              </div>

              <h3 className="mb-3 mt-6 text-sm font-black uppercase tracking-[0.2em] text-red-400">Partnership opportunities</h3>
              <div className="space-y-3 text-sm leading-6 text-gray-300">
                <div><strong className="text-white">Hardware &amp; Tech Sponsorships</strong><br />PC component showcases, peripherals, software tool reviews, and live tech setups or breakdowns.</div>
                <div><strong className="text-white">Gaming &amp; Indie Showcases</strong><br />Playtests, sponsored game streams, community play sessions, and event co-hosting.</div>
                <div><strong className="text-white">Collabs &amp; Creator Crossovers</strong><br />Multi-streamer events, custom stream tools, web projects, and high-energy group broadcasts.</div>
              </div>

              <div className="mt-6 border-t border-red-600/20 pt-5">
                <h3 className="mb-2 text-xl font-black uppercase italic text-white">Ready to plug in?</h3>
                <p className="mb-4 text-sm leading-6 text-gray-300">Let&apos;s create something distinct. Reach out to request a media kit or pitch a custom collaboration.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="https://www.twitch.tv/vexoncore" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded border border-red-600/30 bg-red-600/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-600/20 hover:text-white"><Twitch size={14} /> Twitch</a>
                  <a href="mailto:contact@vixon.online?subject=VEXON%20partnership%20inquiry" className="inline-flex items-center gap-2 rounded border border-red-600/30 bg-red-600/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-600/20 hover:text-white"><Mail size={14} /> Business inquiries</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const StaffPage = ({ onNavigate }) => {
  const defaultStaff = [
    { role: 'Brand Founder / Chief Executive Officer', name: 'VexonCore', detail: 'Brand vision, executive direction, and creator leadership.' },
    { role: 'Brand Manager in Training / Chief Content Officer', name: 'Testing10325', detail: 'Brand development, content strategy, and staff leadership.' },
    { role: 'Admin', name: 'Shadow', detail: 'Community administration and support.' },
    { role: 'Mod', name: 'A Random User', detail: 'Community moderation and support.' },
    { role: 'Mod', name: 'Killer I', detail: 'Community moderation and support.' },
    { role: 'T Mod', name: 'gisellehrndz', detail: 'Community moderation and support.' },
  ];
  const [staff, setStaff] = useState(defaultStaff);

  useEffect(() => {
    let isActive = true;
    let controller;
    const loadStaff = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetchLiveData('/api/discord-staff', controller.signal);
        if (!response.ok) throw new Error('Discord staff service unavailable');
        const { staff: discordStaff = [] } = await response.json();
        if (!isActive) return;
        setStaff((currentStaff) => currentStaff.map((member) => {
          const liveMember = discordStaff.find((profile) => profile.name === member.name);
          return liveMember && !liveMember.unavailable
            ? { ...member, name: liveMember.displayName || member.name, avatarUrl: liveMember.avatarUrl, discordStatus: liveMember.status }
            : member;
        }));
      } catch (error) {
        if (error.name !== 'AbortError') return;
      }
    };
    loadStaff();
    const interval = window.setInterval(loadStaff, liveDataRefreshMs);
    window.addEventListener('focus', loadStaff);
    return () => {
      isActive = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', loadStaff);
    };
  }, []);

  return (
    <div className="pt-32 pb-24">
      <section className="py-20 border-b border-red-600/10 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_60%)]">
        <div className="container mx-auto px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div><div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Operations Deck</div><h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Staff_Page</h1></div>
            <button onClick={() => onNavigate('/')} className="rounded border border-red-600/30 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/10 hover:text-white">Return Home</button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {staff.map((member) => <article key={member.role} className="border border-red-600/20 bg-[#0d0707] p-7"><div className="mb-8 flex items-center gap-3">{member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <UserRound className="text-red-500" size={24} />} {member.discordStatus && <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-400">Discord {member.discordStatus}</span>}</div><div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-red-400">{member.role}</div><h2 className="mb-3 text-2xl font-black uppercase italic text-white">{member.name}</h2><p className="text-sm leading-7 text-gray-400">{member.detail}</p></article>)}
          </div>
          <div className="mt-8 flex items-center gap-4 border border-red-600/20 bg-black/30 p-5 text-sm text-gray-300"><Crown className="shrink-0 text-red-500" size={20} /> Staff profiles can be expanded as the team grows. <a className="font-black text-red-400 hover:text-white" href="https://discord.gg/YUYhtgXZjw" target="_blank" rel="noreferrer">Join HQ on Discord</a></div>
        </div>
      </section>
    </div>
  );
};

const PatreonPage = ({ onNavigate }) => {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('Loading supporter feed');

  useEffect(() => {
    const endpoint = import.meta.env.VITE_PATREON_MEMBERS_URL || '/api/patreon';
    let isActive = true;
    let controller;
    const loadMembers = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetchLiveData(endpoint, controller.signal);
        if (!response.ok) throw new Error('Supporter feed unavailable');
        const data = await response.json();
        if (!isActive) return;
        setMembers(Array.isArray(data) ? data : data.members || []);
        setStatus('Live supporter feed connected');
      } catch (error) {
        if (error.name !== 'AbortError' && isActive) setStatus('Patreon API setup required');
      }
    };
    loadMembers();
    const interval = window.setInterval(loadMembers, liveDataRefreshMs);
    window.addEventListener('focus', loadMembers);
    return () => {
      isActive = false;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', loadMembers);
    };
  }, []);

  return (
    <div className="pt-32 pb-24"><section className="py-20 border-b border-red-600/10 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_60%)]"><div className="container mx-auto px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Supporter Network</div><h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Patreon_Page</h1></div><button onClick={() => onNavigate('/')} className="rounded border border-red-600/30 bg-black/40 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/10 hover:text-white">Return Home</button></div>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]"><div className="border border-red-600/20 bg-[#0d0707] p-8"><LockKeyhole className="mb-8 text-red-500" size={26} /><div className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Supporter Roll Call</div><h2 className="mb-4 text-3xl font-black uppercase italic text-white">The people powering the signal.</h2><p className="mb-6 text-sm leading-7 text-gray-300">A massive thank you to everyone standing behind the stream, backing the tech, and keeping the signal strong. This system runs on your support.</p><p className="mb-6 border-l-4 border-red-600 bg-red-600/5 p-4 text-sm italic leading-7 text-gray-300">Active supporters automatically sync and display here via Patreon.</p><a href="https://www.patreon.com/cw/VexonStudios" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-red-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black">Join on Patreon <ExternalLink size={14} /></a></div>
        <div className="border border-red-600/20 bg-[#0d0707] p-8"><div className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Users2 className="text-red-500" size={20} /><h2 className="text-2xl font-black uppercase italic text-white">Supporter_Names</h2></div><span className="text-right text-[9px] font-black uppercase tracking-[0.15em] text-red-400">{status}</span></div><div className="grid gap-3 sm:grid-cols-2">{members.length ? members.map((member, index) => <div key={`${member.name}-${index}`} className="border border-red-600/15 bg-black/30 p-4"><div className="text-sm font-black uppercase text-white">{member.name || 'Anonymous supporter'}</div><div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-red-500">{member.tier || 'Supporter'}</div></div>) : <p className="text-sm text-gray-500">No public supporter names returned yet.</p>}</div></div>
      </div>
    </div></section></div>
  );
};

export default function App() {
  const contactEmail = "contact@vixon.online";
  const twitchChannel = "vexoncore";
  const dubbyLink = 'https://www.dubby.gg/discount/VexonCore?ref=k4zlh7j1';
  const dubbyCouponCode = 'VexonCore';
  const socialProfiles = {
    twitch: 'https://www.twitch.tv/vexoncore',
    youtube: 'https://www.youtube.com/@VixonOfficial',
    tiktok: 'https://www.tiktok.com/@jeremiah_yt_official',
    x: 'https://x.com/VixonOfficial',
    instagram: 'https://www.instagram.com/vexonofficialvt/',
  };
  const [activeTab, setActiveTab] = useState('stream'); 
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [parentDomain, setParentDomain] = useState('');
  const [socialStats, setSocialStats] = useState({
    twitchFollowers: null,
    youtubeSubscribers: null,
    tiktokFollowers: null,
    discordMembers: null,
  });
  
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'NEURAL_LINK_ESTABLISHED. I am VEXON_SYS. Query the protocol.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const [trackPrompt, setTrackPrompt] = useState('');
  const [generatedTrack, setGeneratedTrack] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setParentDomain(window.location.hostname);
  }, []);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const [twitchResponse, socialResponse] = await Promise.all([
          fetchLiveData('/api/twitch'),
          fetchLiveData('/api/social-stats'),
        ]);
        const nextStats = { twitchFollowers: null, youtubeSubscribers: null, tiktokFollowers: null, discordMembers: null };
        if (twitchResponse.ok) {
          const twitchData = await twitchResponse.json();
          nextStats.twitchFollowers = twitchData.streamers?.find((streamer) => streamer.login === twitchChannel)?.followers ?? null;
        }
        if (socialResponse.ok) {
          const socialData = await socialResponse.json();
          Object.assign(nextStats, socialData);
        }
        setSocialStats(nextStats);
      } catch (error) {
        console.error('Failed to fetch social stats', error);
      }
    };

    fetchLiveStats();
    const interval = window.setInterval(fetchLiveStats, liveDataRefreshMs);
    window.addEventListener('focus', fetchLiveStats);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', fetchLiveStats);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAiChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    const systemPrompt = `You are Vexon, a Protogen wolf digital entity. Personality: protective, aggressive but loyal, obsessed with Phonk. Terminal style responses. Concise.`;
    const response = await callGemini(userMsg, systemPrompt);
    setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    setIsTyping(false);
  };

  const generateTrackConcept = async () => {
    if (!trackPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    const prompt = `Generate Phonk concept: "${trackPrompt}". Title and 2-sentence breakdown.`;
    const result = await callGemini(prompt, "Professional Phonk producer.");
    setGeneratedTrack(result);
    setIsGenerating(false);
  };

  if (currentPath === '/neural-override') {
    return (
      <div className="min-h-screen bg-black text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <NeuralOverridePage onNavigate={navigateTo} />
      </div>
    );
  }

  if (currentPath === '/terms' || currentPath === '/privacy') {
    return (
      <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <PolicyPage type={currentPath === '/privacy' ? 'privacy' : 'terms'} onNavigate={navigateTo} />
      </div>
    );
  }

  if (currentPath === '/lore') {
    return (
      <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <LorePage onNavigate={navigateTo} />
      </div>
    );
  }

  if (currentPath === '/streamers') {
    return (
      <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <StreamersPage onNavigate={navigateTo} />
      </div>
    );
  }

  if (currentPath === '/partnerships') {
    return (
      <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <PartnershipsPage dubbyLink={dubbyLink} dubbyCouponCode={dubbyCouponCode} onNavigate={navigateTo} />
      </div>
    );
  }

  if (currentPath === '/staff') {
    return (
      <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <StaffPage onNavigate={navigateTo} />
      </div>
    );
  }

  if (currentPath === '/patreon') {
    return (
      <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
        <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
        <Navbar currentPath={currentPath} onNavigate={navigateTo} />
        <PatreonPage onNavigate={navigateTo} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      <Navbar currentPath={currentPath} onNavigate={navigateTo} />

      <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#1a0a0a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="relative mb-12 h-[220px] overflow-hidden border-2 border-red-600/50 bg-[#0d0707] shadow-[0_0_50px_rgba(220,38,38,0.15)] md:h-[360px]">
            <img src="/vexon-banner.png" alt="Vexon in a neon city" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0505]/70 via-transparent to-black/10" />
          </div>
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-0.5 bg-red-600 text-[10px] font-black text-white uppercase italic">Active</span>
              <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">Model: Protogen // Wolf // Male</span>
            </div>
            <h1 className="text-7xl md:text-9xl font-black leading-[0.8] mb-8 tracking-tighter italic uppercase">
              VEXON<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">CORE</span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed border-l-4 border-red-600 pl-6 bg-red-600/5 py-4">
              A creator-first system built around live presence, sharp visuals, and a relentless digital identity tuned for streams, music, and motion.
            </p>
            <p className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-500/80">
              <img src="/vexon-logo.png" alt="" className="h-5 w-5 object-cover mix-blend-multiply" />
              Signal hint: the VEXON_SYS mark hides a classified override.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#live" className="bg-red-600 text-white px-10 py-5 font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center border-b-4 border-red-900">
                LIVE_FEED <Radio size={18} className="ml-2 animate-pulse" />
              </a>
              <a href="#dossier" className="border border-red-600/40 bg-black/30 px-8 py-5 font-black uppercase tracking-widest text-red-400 hover:bg-red-600/10 transition-all">
                VIEW_DOSSIER
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="live" className="py-24 relative bg-black border-y border-red-900/30">
        <div className="container mx-auto px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Stream Matrix</div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Live_Transmission</h2>
            </div>
            <div className="flex rounded border border-red-900/50 bg-[#120a0a] p-1">
              <button onClick={() => setActiveTab('stream')} className={`px-4 py-2 text-[10px] font-black uppercase transition-all ${activeTab === 'stream' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Video</button>
              <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-[10px] font-black uppercase transition-all ${activeTab === 'chat' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Chat</button>
            </div>
          </div>
          <div className="relative w-full aspect-video bg-[#0d0707] border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
            {parentDomain && (
              <iframe
                src={activeTab === 'stream' ? `https://player.twitch.tv/?channel=${twitchChannel}&parent=${parentDomain}&muted=true&autoplay=false` : `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=${parentDomain}&darkpopout`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
              ></iframe>
            )}
          </div>
        </div>
      </section>

      <section id="dossier" className="py-24 bg-black relative">
        <div className="container mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-5xl font-black uppercase italic text-white tracking-tighter">VEXON_DOSSIER</h2>
            <p className="text-[10px] text-red-600 font-bold tracking-[.4em] mt-2">CLASSIFIED_INTEL // SECTOR_7</p>
          </div>
          <DossierSection />
        </div>
      </section>

      <section id="lore-preview" className="py-20 bg-[#0c0606] border-y border-red-600/10">
        <div className="container mx-auto px-6">
          <div className="rounded border border-red-600/20 bg-[#0d0707] p-8 shadow-[0_0_30px_rgba(220,38,38,0.08)]">
            <div className="mb-4 flex items-center gap-2 text-red-400">
              <BookOpen size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Lore Archive</span>
            </div>
            <h2 className="mb-3 text-3xl font-black uppercase italic text-white">Lore_Ready</h2>
            <p className="max-w-3xl text-sm leading-7 text-gray-300">
              The lore experience now lives on its own route, while the homepage stays centered on live streaming, dossier intel, and the core creator experience.
            </p>
            <button onClick={() => navigateTo('/lore')} className="mt-6 rounded border border-red-600/30 bg-red-600/10 px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/20 hover:text-white">
              Enter Lore Page
            </button>
          </div>
        </div>
      </section>

      <section id="partners-preview" className="py-20 bg-black border-b border-red-600/10">
        <div className="container mx-auto px-6">
          <div className="rounded border border-red-600/20 bg-gradient-to-br from-red-600/10 to-black/30 p-8">
            <div className="mb-4 flex items-center gap-2 text-red-400">
              <Handshake size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Official Network</span>
            </div>
            <h2 className="mb-3 text-3xl font-black uppercase italic text-white">Partnerships_Ready</h2>
            <p className="max-w-3xl text-sm leading-7 text-gray-300">
              The VEXON partner experience now lives on its own page, while the homepage stays focused on live streaming, lore, and the creator experience.
            </p>
            <button onClick={() => navigateTo('/partnerships')} className="mt-6 rounded border border-red-600/30 bg-red-600/10 px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-red-400 transition hover:bg-red-600/20 hover:text-white">
              Enter Partner Page
            </button>
          </div>
        </div>
      </section>

      <section id="stats" className="py-20 border-y border-red-600/20 bg-red-950/5">
        <div className="container mx-auto px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-red-500">Creator Dashboard</div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Live_Stats</h2>
            </div>
            <div className="rounded border border-red-600/20 bg-black/30 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
              Synced live • updates now
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Twitch} label="Twitch Followers" value={socialStats.twitchFollowers === null ? '—' : `${toCompactNumber(socialStats.twitchFollowers)}+`} />
            <StatCard icon={Youtube} label="YouTube Subs" value={socialStats.youtubeSubscribers === null ? '—' : `${toCompactNumber(socialStats.youtubeSubscribers)}+`} />
            <StatCard icon={Music} label="TikTok Followers" value={socialStats.tiktokFollowers === null ? '—' : `${toCompactNumber(socialStats.tiktokFollowers)}+`} />
            <StatCard icon={Shield} label="Discord Members" value={socialStats.discordMembers === null ? '—' : `${toCompactNumber(socialStats.discordMembers)}+`} />
          </div>
        </div>
      </section>

      <section id="spec" className="py-24 bg-[#0c0606] border-y border-red-600/10">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">The_Unit</h2>
            <div className="p-8 border border-red-900/30 bg-[#080404] relative">
              <div className="absolute -top-3 -left-3 bg-red-600 p-2"><Terminal size={16} className="text-white"/></div>
              <ul className="space-y-4 font-mono text-sm">
                <li className="flex justify-between border-b border-gray-900 pb-2"><span className="text-gray-500 italic">GENRE:</span><span className="text-gray-200">PHONK / EDM</span></li>
                <li className="flex justify-between border-b border-gray-900 pb-2"><span className="text-gray-500 italic">EQUIPMENT:</span><span className="text-gray-200">KATANA / TECH</span></li>
                <li className="flex justify-between border-b border-gray-900 pb-2"><span className="text-gray-500 italic">TRAITS:</span><span className="text-gray-200">BRAVERY / PROTECTIVE</span></li>
              </ul>
            </div>
          </div>

          <div className="bg-[#120a0a] border-2 border-red-600 flex flex-col h-[500px] shadow-[0_0_30px_rgba(220,38,38,0.1)]">
             <div className="bg-red-600 p-3 flex items-center gap-2">
                <Sparkles size={16} className="text-white animate-pulse" />
                <span className="text-[10px] font-black uppercase text-white tracking-widest italic">✨ Vexon Neural Uplink</span>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 text-xs ${m.role === 'user' ? 'bg-red-900/40 border border-red-600 text-white italic' : 'bg-gray-900/50 border border-gray-800 text-gray-300'}`}>
                      <div className="text-[8px] opacity-50 mb-1 uppercase font-black">{m.role === 'user' ? 'SOURCE_INPUT' : 'VEXON_CORE'}</div>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-900/50 border border-gray-800 p-3 flex gap-2">
                      <Loader2 className="animate-spin text-red-600" size={14} />
                      <span className="text-[10px] text-gray-500 italic">SYNCING_DATA...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
             </div>
             <form onSubmit={handleAiChat} className="p-3 border-t border-gray-900 flex gap-2">
                <input 
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="QUERY_PROTOCOL..." 
                  className="flex-1 bg-black border border-gray-800 p-3 text-xs outline-none focus:border-red-600 text-white"
                />
                <button type="submit" className="bg-red-600 p-3 text-white hover:bg-white hover:text-black transition-all">
                  <Send size={16} />
                </button>
             </form>
          </div>
        </div>
      </section>

      <section id="archives" className="py-24 bg-black">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black uppercase italic text-white tracking-tighter mb-4 underline decoration-red-600">Archives</h2>
            <div className="grid md:grid-cols-3 gap-12 mt-12">
              <DiskReel title="Phonk_Mix_01" type="High_Frequency" color="from-red-900 to-black" />
              <DiskReel title="Katana_VFX" type="Combat_Log" color="from-red-600 to-red-950" />
              <DiskReel title="Glitch_Core" type="Experimental" color="from-gray-900 to-black" />
            </div>
          </div>

          <div className="max-w-4xl mx-auto bg-red-950/10 border border-red-600/30 p-8">
             <div className="flex items-center gap-3 mb-6">
                <Sparkles size={24} className="text-red-500" />
                <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">✨ Sync_Track_Concept</h3>
             </div>
             <div className="flex flex-col md:flex-row gap-4">
                <input 
                  value={trackPrompt}
                  onChange={(e) => setTrackPrompt(e.target.value)}
                  placeholder="Describe a vibe (e.g. 'Night drive in Neo-Tokyo')" 
                  className="flex-1 bg-black border border-gray-800 p-4 text-sm outline-none focus:border-red-600"
                />
                <button 
                  onClick={generateTrackConcept}
                  disabled={isGenerating}
                  className="bg-red-600 text-white px-8 py-4 font-black uppercase text-xs hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Execute_Sync
                </button>
             </div>
             {generatedTrack && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 bg-black/80 border-l-4 border-red-600 font-mono text-sm leading-relaxed">
                  <div className="text-red-600 font-black mb-2 italic uppercase underline tracking-widest">TRANSMISSION_RESULT:</div>
                  <pre className="whitespace-pre-wrap text-gray-300">{generatedTrack}</pre>
               </motion.div>
             )}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-6xl font-black mb-6 uppercase italic text-white tracking-tighter">SYNC_UP</h2>
            <a href={`mailto:${contactEmail}`} className="group flex items-center space-x-6 bg-red-600/5 p-4 border border-transparent hover:border-red-600 transition-all">
              <div className="bg-red-600 p-4 shadow-[0_0_15px_rgba(220,38,38,0.3)]"><Mail size={24} className="text-white"/></div>
              <div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">Direct_Channel</div>
                <div className="text-xl md:text-2xl font-black text-white group-hover:text-red-500 transition-colors uppercase italic">{contactEmail}</div>
              </div>
            </a>
          </div>
          <form className="bg-[#120a0a] border border-red-900/50 p-10 relative">
            <div className="space-y-6">
              <input placeholder="IDENTITY_REQUIRED" className="w-full bg-black border border-gray-800 text-white p-4 focus:border-red-600 outline-none" />
              <textarea placeholder="INPUT_PAYLOAD..." rows="4" className="w-full bg-black border border-gray-800 text-white p-4 focus:border-red-600 outline-none resize-none"></textarea>
              <button className="flex w-full items-center justify-center bg-white py-5 font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-red-600 hover:text-white">
                SEND_ENCRYPTED <ChevronRight size={18} />
              </button>
            </div>
          </form>
        </div>
      </section>

      <footer className="py-12 border-t border-red-900/20 bg-black">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-700 text-[9px] font-bold uppercase tracking-[0.4em]">
            <p>© 2025 // VEXON_PROTOCOL // SYS_VERSION_4.2.0</p>
          </div>
          <div className="flex space-x-8 text-red-600">
            <a href={socialProfiles.x} target="_blank" rel="noreferrer" aria-label="X"><Twitter size={16} className="transition-colors hover:text-white" /></a>
            <a href={socialProfiles.twitch} target="_blank" rel="noreferrer" aria-label="Twitch"><Twitch size={16} className="transition-colors hover:text-white" /></a>
            <a href={socialProfiles.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube size={16} className="transition-colors hover:text-white" /></a>
            <a href={socialProfiles.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><Music size={16} className="transition-colors hover:text-white" /></a>
            <a href={socialProfiles.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={16} className="transition-colors hover:text-white" /></a>
          </div>
          <div className="flex gap-4 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
            <button onClick={() => navigateTo('/terms')} className="hover:text-red-400">Terms</button>
            <button onClick={() => navigateTo('/privacy')} className="hover:text-red-400">Privacy</button>
          </div>
        </div>
      </footer>
    </div>
  );
}