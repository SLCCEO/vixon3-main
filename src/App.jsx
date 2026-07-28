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
  Target
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

const buildLocalFallback = (prompt, reason = "The neural link is currently unavailable.") => {
  const trimmedPrompt = (prompt || "").trim();
  const preview = trimmedPrompt
    ? ` You asked: "${trimmedPrompt.slice(0, 90)}${trimmedPrompt.length > 90 ? '...' : ''}"`
    : "";

  return `VEXON_CORE // LOCAL PROTOCOL ACTIVE. ${reason}${preview} I’m operating in offline mode, but I’m still here.`;
};

async function callGemini(prompt, systemInstruction = "") {
  if (!apiKey) {
    console.warn("Gemini API key missing. Using local fallback response.");
    return buildLocalFallback(prompt, "The neural link is currently unavailable, but local protocol mode is active.");
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
    return { response, result, url };
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

  return buildLocalFallback(prompt, `The uplink failed: ${lastError}`);
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

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Live', href: '#live' },
    { name: 'Dossier', href: '#dossier' },
    { name: 'Archives', href: '#archives' },
    { name: 'Contact', href: '#contact' }
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0a0505]/95 backdrop-blur-md py-3 border-b border-red-600/30' : 'bg-transparent py-6'}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="text-2xl font-black tracking-tighter text-red-500 italic flex items-center gap-2"
        >
          <div className="w-8 h-8 border-2 border-red-600 rounded-sm rotate-45 flex items-center justify-center">
            <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>
          </div>
          VEXON_SYS
        </motion.div>

        <div className="hidden md:flex space-x-8">
          {navLinks.map((link) => (
            <a key={link.name} href={link.href} className="text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest text-xs transition-colors">
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
                  onClick={() => setMobileMenuOpen(false)}
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

export default function App() {
  const contactEmail = "contact@vixon.online";
  const twitchChannel = "vexoncore";
  const [activeTab, setActiveTab] = useState('stream'); 
  const [parentDomain, setParentDomain] = useState('');
  
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

  return (
    <div className="min-h-screen bg-[#0a0505] text-gray-200 selection:bg-red-600 selection:text-white font-mono">
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      <Navbar />

      <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a0a0a_1px,transparent_1px),linear-gradient(to_bottom,#1a0a0a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2 py-0.5 bg-red-600 text-[10px] font-black text-white uppercase italic">Active</span>
              <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">Model: Protogen // Wolf // Male</span>
            </div>
            <h1 className="text-7xl md:text-9xl font-black leading-[0.8] mb-8 tracking-tighter italic uppercase">
              VEXON<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-900 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]">CORE</span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-lg leading-relaxed border-l-4 border-red-600 pl-6 bg-red-600/5 py-4">
              Integrated with tech gear and visor displays. Expert in high-frequency Phonk, EDM, and Glitch. Specialist in Katana combat aesthetics.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#live" className="bg-red-600 text-white px-10 py-5 font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center border-b-4 border-red-900">
                LIVE_FEED <Radio size={18} className="ml-2 animate-pulse" />
              </a>
            </div>
          </motion.div>
          <div className="relative h-[500px] w-full bg-[#0d0707] border-2 border-red-600/50 shadow-[0_0_50px_rgba(220,38,38,0.15)] flex items-center justify-center overflow-hidden">
             <Cpu size={120} className="text-red-900/10 absolute animate-pulse" />
             <div className="z-10 text-center p-8">
               <div className="text-red-600 font-black text-3xl mb-4 italic">NEURAL_REPRESENTATION</div>
               <div className="text-[10px] text-gray-500 uppercase tracking-widest">Digital Avatar: Vexon Unit 4.0</div>
             </div>
          </div>
        </div>
      </section>

      <section id="live" className="py-24 relative bg-black border-y border-red-900/30">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-5xl font-black uppercase italic text-white tracking-tighter">Live_Transmission</h2>
            <div className="flex bg-[#120a0a] border border-red-900/50 p-1">
              <button onClick={() => setActiveTab('stream')} className={`px-4 py-2 text-[10px] font-black uppercase ${activeTab === 'stream' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Video</button>
              <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 text-[10px] font-black uppercase ${activeTab === 'chat' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>Chat</button>
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

      <section id="stats" className="py-20 border-y border-red-600/20 bg-red-950/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Twitter} label="Neural_Net" value="81" />
            <StatCard icon={Twitch} label="Live_Feed" value="154" />
            <StatCard icon={Youtube} label="Archives" value="437" />
            <StatCard icon={Shield} label="Guard_Rank" value="S+" />
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
              <button className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-5 hover:bg-red-600 hover:text-white transition-all flex justify-center items-center">
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
            <Twitter size={16} className="hover:text-white transition-colors cursor-pointer" />
            <Twitch size={16} className="hover:text-white transition-colors cursor-pointer" />
            <Youtube size={16} className="hover:text-white transition-colors cursor-pointer" />
            <Music size={16} className="hover:text-white transition-colors cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );

}
