import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, Sword, Target, Activity, Loader2 } from 'lucide-react';

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
    <div className="bg-[#0d0707] border-2 border-red-600/30 p-6 shadow-2xl">
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
          <motion.div key="subject" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="md:col-span-2 space-y-6">
              <div className="p-6 border-l-4 border-red-600 bg-red-600/5">
                <h3 className="text-2xl font-black text-white italic uppercase mb-2">Subject: V-01</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Elite Protogen-class hybrid. Specialization: <span className="text-red-500">Urban Guerilla & Phonk-Rhythm Combat</span>. 
                  Exhibits h
