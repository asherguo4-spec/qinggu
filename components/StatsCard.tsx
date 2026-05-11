
import React from 'react';
import { Shield, Zap, Heart, Star } from 'lucide-react';
import { CreationStats } from '../types';
import { translations, LanguageCode } from '../translations';

interface StatsCardProps {
  lang?: LanguageCode;
  stats: CreationStats;
  lore: string;
  theme?: 'light' | 'dark';
}

const StatsCard: React.FC<StatsCardProps> = ({ lang = 'zh', stats, lore, theme = 'light' }) => {
  const t = translations[lang as LanguageCode].stats;

  const StatRow = ({ label, value, icon: Icon, color }: any) => (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center space-x-1.5">
          <Icon size={12} className={color} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{label}</span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${theme === 'dark' ? 'text-purple-200' : 'text-gray-900'}`}>{value}</span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-purple-950' : 'bg-gray-100'}`}>
        <div 
          className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000 shadow-sm`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className={`rounded-[28px] p-7 border relative shadow-sm transition-colors duration-500 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'glass-card border-white/80 bg-white/60'}`}>
      <div className="absolute top-0 right-0 px-4 py-1.5 bg-purple-600 text-[10px] font-black italic rounded-bl-2xl text-white shadow-sm">
        {stats.rarity}
      </div>
      <div className="mb-7">
        <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3">{t.lore}</h3>
        <p className={`text-sm font-medium italic leading-relaxed ${theme === 'dark' ? 'text-purple-200' : 'text-gray-700'}`}>"{lore}"</p>
      </div>
      <div className="space-y-4.5">
        <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-4">{t.module}</h3>
        <StatRow label={t.power} value={stats.power} icon={Zap} color="text-yellow-500" />
        <StatRow label={t.agility} value={stats.agility} icon={Star} color="text-blue-500" />
        <StatRow label={t.soul} value={stats.soul} icon={Heart} color="text-pink-500" />
      </div>
    </div>
  );
};

export default StatsCard;
