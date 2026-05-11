
import React from 'react';
import { Shield, MapPin, Headphones, ChevronRight, UserPlus, Crown, Gem, BadgeCheck, ClipboardList, ChevronLeft, Info, LogIn, Heart } from 'lucide-react';
import { AppView, UserProfile } from '../types';
import { translations, LanguageCode } from '../translations';

interface ProfileProps {
  lang: LanguageCode;
  setView: (view: AppView) => void;
  userProfile: UserProfile;
  onLogout: () => void;
  theme: 'light' | 'dark';
}

const Profile: React.FC<ProfileProps> = ({ lang, setView, userProfile, onLogout, theme }) => {
  const t = translations[lang as LanguageCode].profile;
  const isGuest = !userProfile.isRegistered;
  const isElite = userProfile.level === 'elite';

  const levelInfo = {
    visitor: { label: t.level_visitor, icon: UserPlus, color: 'text-slate-400', bg: 'bg-slate-50' },
    creator: { label: t.level_creator, icon: Shield, color: 'text-blue-500', bg: 'bg-blue-50' },
    elite: { label: t.level_elite, icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50' },
  };

  const currentLevel = levelInfo[userProfile.level as keyof typeof levelInfo] || levelInfo.visitor;

  return (
    <div className={`h-full flex flex-col font-sans overflow-y-auto no-scrollbar pb-32 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
      <div className={`px-6 pt-8 pb-4 flex items-center justify-between shrink-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white'}`}>
        <button 
          onClick={() => setView(AppView.HOME)} 
          className={`p-2.5 rounded-full shadow-sm border active:scale-90 transition-all md:hidden ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-gray-400 border-gray-100'}`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-black uppercase tracking-[0.3em] leading-none ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-300'}`}>Account</span>
          <span className={`text-[12px] font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</span>
        </div>
        <div className="w-11"></div>
      </div>

      <div className={`px-6 pb-12 mb-2 shrink-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)]'}`}>
        <div className={`flex items-center space-x-5 w-full text-left ${!isGuest ? 'cursor-pointer' : ''}`} onClick={() => !isGuest && setView(AppView.SETTINGS)}>
          <div className="relative shrink-0">
            <div className={`w-16 h-16 rounded-[20px] overflow-hidden border shadow-sm ${theme === 'dark' ? 'bg-purple-900 border-purple-800/50' : 'bg-gray-50 border-gray-100'}`}>
              <img src={userProfile.avatar} className="w-full h-full object-cover" alt="avatar" />
            </div>
            {!isGuest && (
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border ${theme === 'dark' ? 'bg-purple-900 border-purple-800/50' : 'bg-white border-gray-50'}`}>
                 {isElite ? <Crown size={12} className="text-purple-500" /> : <BadgeCheck size={12} className="text-blue-500" />}
              </div>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center space-x-2 mb-0.5">
              <h1 className={`text-2xl font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{userProfile.nickname}</h1>
              {isElite && <Gem size={16} className="text-purple-500 shrink-0" />}
            </div>
            <div className="flex items-center space-x-2 overflow-visible">
              {!isGuest && (
                <>
                  <span className={`text-[13px] font-medium whitespace-nowrap ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-400'}`}>{t.uid}: {userProfile.shortId}</span>
                  <div className={`flex items-center space-x-1 px-1.5 py-0.5 rounded border shrink-0 ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50' : 'bg-gray-50 border-gray-100'}`}>
                     <currentLevel.icon size={10} className={currentLevel.color} />
                     <span className={`text-[9px] font-bold ${currentLevel.color}`}>{currentLevel.label}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {!isGuest && <ChevronRight size={20} className={theme === 'dark' ? 'text-purple-700' : 'text-gray-300'} />}
        </div>

        {isGuest && (
          <div className="mt-8">
            <button 
              onClick={() => setView(AppView.REGISTER)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[15px] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <LogIn size={18} />
              <span>{t.regBtn}</span>
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-4 font-medium tracking-wide">
              {lang === 'zh' ? '登录后即可开启您的专属造物档案' : lang === 'en' ? 'Sign in to unlock your creation archive' : 'ログインして創造アーカイブをアンロック'}
            </p>
          </div>
        )}
      </div>

      <div className={`mb-2 divide-y shrink-0 shadow-sm transition-colors duration-500 ${theme === 'dark' ? 'bg-purple-900/20 divide-purple-800/30' : 'bg-white divide-gray-50'}`}>
        <button 
          onClick={() => setView(AppView.ORDERS)}
          className={`w-full flex items-center justify-between px-6 py-5 transition-colors text-left ${theme === 'dark' ? 'active:bg-purple-800/30' : 'active:bg-gray-50'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <ClipboardList size={22} />
            </div>
            <span className={`text-[16px] font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{translations[lang].orders.title}</span>
          </div>
          <ChevronRight size={18} className={theme === 'dark' ? 'text-purple-800' : 'text-gray-200'} />
        </button>

        <button 
          onClick={() => setView(AppView.FAVORITES)}
          className={`w-full flex items-center justify-between px-6 py-5 transition-colors text-left ${theme === 'dark' ? 'active:bg-purple-800/30' : 'active:bg-gray-50'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Heart size={22} />
            </div>
            <span className={`text-[16px] font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{translations[lang].favorites.title}</span>
          </div>
          <ChevronRight size={18} className={theme === 'dark' ? 'text-purple-800' : 'text-gray-200'} />
        </button>

        <button 
          onClick={() => setView(AppView.ADDRESS_LIST)}
          className={`w-full flex items-center justify-between px-6 py-5 transition-colors text-left ${theme === 'dark' ? 'active:bg-purple-800/30' : 'active:bg-gray-50'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <MapPin size={22} />
            </div>
            <span className={`text-[16px] font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.address}</span>
          </div>
          <ChevronRight size={18} className={theme === 'dark' ? 'text-purple-800' : 'text-gray-200'} />
        </button>
        
        <button 
          onClick={() => setView(AppView.CUSTOMER_SERVICE)}
          className={`w-full flex items-center justify-between px-6 py-5 transition-colors text-left ${theme === 'dark' ? 'active:bg-purple-800/30' : 'active:bg-gray-50'}`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Headphones size={22} />
            </div>
            <span className={`text-[16px] font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.service}</span>
          </div>
          <ChevronRight size={18} className={theme === 'dark' ? 'text-purple-800' : 'text-gray-200'} />
        </button>
      </div>

      <div className="flex flex-col items-center space-y-8 mt-12 mb-6 px-6">
        <div className="flex items-center justify-center w-full">
           <button onClick={() => setView(AppView.ABOUT_US)} className={`text-xs font-black tracking-widest uppercase transition-colors ${theme === 'dark' ? 'text-purple-400/60 hover:text-purple-400' : 'text-gray-400 hover:text-purple-600'}`}>{t.about}</button>
        </div>
        
        <div className="flex items-center justify-center space-x-2.5 opacity-10">
          <Info size={10} className={theme === 'dark' ? 'text-purple-400' : 'text-slate-400'} />
          <span className={`text-[9px] font-mono font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-purple-400' : 'text-slate-400'}`}>
            {t.build}: 2026.01.28-v9.Welcoming.Light
          </span>
        </div>
      </div>

      {!isGuest && (
        <div className="px-6 shrink-0 mt-4">
          <button 
            onClick={() => onLogout()}
            className={`w-full flex items-center justify-center py-4 rounded-2xl font-black text-[14px] transition-colors bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm`}
          >
            {t.logout}
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
