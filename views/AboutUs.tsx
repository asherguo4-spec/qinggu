
import React from 'react';
import { ChevronLeft, Info, Globe, MapPin, Target, Zap, Rocket, Star, Cpu, Instagram, Twitter } from 'lucide-react';
import { AppView } from '../types';

import { translations, LanguageCode } from '../translations';

interface AboutUsProps {
  lang: LanguageCode;
  onBack: () => void;
  theme: 'light' | 'dark';
}

const AboutUs: React.FC<AboutUsProps> = ({ lang, onBack, theme }) => {
  const t = translations[lang as LanguageCode].about;
  return (
    <div className={`min-h-screen p-6 pb-32 animate-in fade-in duration-700 h-full overflow-y-auto no-scrollbar relative transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white'}`}>
      {/* 氛围光效 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[40%] blur-[120px] rounded-full transition-colors duration-500 ${theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-100/50'}`}></div>
        <div className={`absolute bottom-[20%] right-[-10%] w-[40%] h-[30%] blur-[100px] rounded-full transition-colors duration-500 ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-50/30'}`}></div>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-4 mb-12 relative z-10">
        <button 
          onClick={onBack} 
          className={`p-2.5 rounded-full border active:scale-90 transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50 text-purple-300' : 'bg-gray-100 border-gray-200 text-gray-600'}`}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className={`text-lg font-black tracking-widest uppercase ${theme === 'dark' ? 'text-white/90' : 'text-gray-900'}`}>{lang === 'ar' ? t.title : `关于 / ${t.title.toUpperCase()}`}</h2>
      </div>

      {/* Brand Hero */}
      <div className="flex flex-col items-center mb-16 relative z-10 text-center">
        <div className="relative mb-6">
          <div className={`absolute inset-0 blur-2xl opacity-20 rounded-full animate-pulse ${theme === 'dark' ? 'bg-white' : 'bg-purple-500'}`}></div>
          <div className={`px-8 py-4 rounded-[24px] flex items-center justify-center relative shadow-2xl border ${theme === 'dark' ? 'bg-white border-white/20' : 'bg-black border-black/10'}`}>
             <span className={`font-black text-2xl tracking-tighter italic lowercase ${theme === 'dark' ? 'text-black' : 'text-white'}`}>selindell</span>
          </div>
        </div>
        <h1 className={`text-3xl font-black tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Selindell <span className="text-purple-600">{lang === 'zh' ? '塞琳德尔' : lang === 'ar' ? 'سيلينديل' : 'Selindell'}</span>
        </h1>
        <div className="flex items-center justify-center space-x-2">
          <div className={`h-[1px] w-4 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}></div>
          <p className={`text-[11px] font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>Yuone Tech Ecosystem</p>
          <div className={`h-[1px] w-4 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}></div>
        </div>
        
        {/* 社交媒体 */}
        <div className="flex items-center justify-center space-x-4 mt-8">
           <a href="https://instagram.com/selindell" target="_blank" rel="noopener noreferrer" className={`p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50 text-purple-400 hover:text-pink-500' : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-pink-500'}`}>
             <Instagram size={20} />
           </a>
           <a href="https://twitter.com/selindell" target="_blank" rel="noopener noreferrer" className={`p-3 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50 text-purple-400 hover:text-blue-400' : 'bg-gray-50 border-gray-100 text-gray-400 hover:text-blue-400'}`}>
             <Twitter size={20} />
           </a>
        </div>
      </div>

      <div className="space-y-12 relative z-10">
        <section className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="flex items-center space-x-2 text-purple-600 mb-5 px-1">
            <Zap size={14} className="animate-pulse" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-600/80">{lang === 'ar' ? t.mission : `品牌使命 / ${t.mission.toUpperCase()}`}</h3>
          </div>
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-[32px] blur opacity-30 group-hover:opacity-100 transition duration-1000`}></div>
            <div className={`relative rounded-[32px] p-8 border backdrop-blur-3xl shadow-xl ${theme === 'dark' ? 'bg-white/[0.03] border-white/10' : 'bg-white border-gray-100'}`}>
              <p className={`text-xl font-black mb-4 italic leading-tight tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.vision}</p>
              <p className={`text-sm leading-relaxed font-medium whitespace-pre-wrap ${theme === 'dark' ? 'text-purple-200/70' : 'text-gray-600'}`}>
                {t.description}
              </p>
            </div>
          </div>
        </section>

        {/* 底部导航建议 */}
        <div className={`pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
           <button 
             onClick={onBack}
             className={`w-full py-4 rounded-2xl text-center font-bold text-sm transition-all ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400 hover:bg-purple-800/40' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
           >
             {t.backHome}
           </button>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
