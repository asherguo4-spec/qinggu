
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { translations, LanguageCode } from '../translations';

interface LoadingAnimationProps {
  lang?: LanguageCode;
  showHint?: boolean;
  theme?: 'light' | 'dark';
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ lang = 'zh', showHint, theme = 'light' }) => {
  const t = translations[lang as LanguageCode].loading;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev < 90) return prev + (Math.random() * 15);
        if (prev < 99) return prev + (Math.random() * 0.5);
        return prev;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-10 py-12 px-10 w-full animate-in fade-in duration-500">
      <div className="relative w-44 h-44">
        <div className={`absolute inset-0 border-[6px] rounded-full shadow-inner ${theme === 'dark' ? 'border-purple-900/40' : 'border-purple-50'}`}></div>
        <div className="absolute inset-0 border-t-[6px] border-purple-600 rounded-full animate-[spin_1.5s_linear_infinite]"></div>
        <div className={`absolute inset-5 border-b-[2px] rounded-full animate-[spin_3s_linear_infinite_reverse] ${theme === 'dark' ? 'border-pink-900/20' : 'border-pink-100'}`}></div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-18 h-18 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl rotate-45 animate-pulse shadow-[0_15px_40px_rgba(168,85,247,0.3)] flex items-center justify-center">
            <span className="text-white font-black -rotate-45 tracking-tighter text-sm uppercase">TINKU</span>
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-5 w-full max-w-xs">
        <div className="space-y-3">
          <h2 className={`text-2xl font-black tracking-tight bg-clip-text text-transparent ${theme === 'dark' ? 'bg-gradient-to-b from-white to-purple-400' : 'bg-gradient-to-b from-gray-900 to-gray-500'}`}>
            {t.title}
          </h2>
          <div className="flex items-center justify-center space-x-2">
            <div className={`h-[1px] w-6 ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}></div>
            <p className="text-purple-600 text-[9px] font-black tracking-[0.4em] uppercase">
              {t.core}
            </p>
            <div className={`h-[1px] w-6 ${theme === 'dark' ? 'bg-purple-900' : 'bg-purple-100'}`}></div>
          </div>
        </div>

        <div className={`relative h-2 w-full rounded-full overflow-hidden p-[1.5px] border shadow-inner ${theme === 'dark' ? 'bg-purple-950 border-purple-900/50' : 'bg-gray-100 border-gray-50'}`}>
          <div 
            className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className={`flex justify-between items-center text-[10px] font-bold ${theme === 'dark' ? 'text-purple-400/60' : 'text-slate-400'}`}>
          <span className="flex items-center">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
            {t.path}
          </span>
          <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{Math.floor(progress)}%</span>
        </div>
      </div>

      {showHint && (
        <div className="pt-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-700 w-full max-w-[280px]">
          <div className="flex items-center justify-center space-x-2 text-purple-600/60 mb-3">
            <Clock size={14} className="animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.thinking}</span>
          </div>
          <p className={`text-[11px] font-medium leading-relaxed ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-500'}`}>
            {t.hint}
          </p>
        </div>
      )}
    </div>
  );
};

export default LoadingAnimation;
