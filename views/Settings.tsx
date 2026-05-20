
import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, User, Mail, FileText, Check, Loader2, LogOut, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/supabase';
import { doc, setDoc } from '../lib/supabase';
import { translations, LanguageCode } from '../translations';

interface SettingsProps { 
  lang: LanguageCode;
  userId: string; 
  profile: UserProfile; 
  onUpdate: (updates: Partial<UserProfile>) => void; 
  onBack: () => void; 
  onLogout: () => void;
  theme?: 'light' | 'dark';
}

const SettingsView: React.FC<SettingsProps> = ({ lang, userId, profile, onUpdate, onBack, onLogout, theme = 'light' }) => {
  const t = translations[lang as LanguageCode].settings;
  const commonT = translations[lang as LanguageCode].common;
  const [formData, setFormData] = useState({ 
    nickname: profile.nickname, 
    email: profile.email, 
    bio: profile.bio || '',
    avatar: profile.avatar 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<{field: string, msg: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFieldError({ field: 'avatar', msg: t.avatarMax });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
        setFieldError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setFieldError(null);
    setSaveSuccess(false);

    if (formData.nickname.trim().length < 2) {
      setFieldError({ field: 'nickname', msg: t.nicknameMin });
      return;
    }
    if (formData.nickname.trim().length > 12) {
      setFieldError({ field: 'nickname', msg: t.nicknameMax });
      return;
    }
    if (formData.bio.length > 50) {
      setFieldError({ field: 'bio', msg: t.bioMax });
      return;
    }

    if (!db) { 
      alert(lang === 'zh' ? "❌ 配置错误：Firestore 状态异常。" : "❌ Config Error: Firestore connection failed."); 
      return; 
    }
    
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', userId), { 
        id: userId, 
        nickname: formData.nickname.trim(),
        bio: formData.bio.trim(),
        avatar: formData.avatar
      }, { merge: true });

      setSaveSuccess(true);
      onUpdate(formData);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setFieldError({ field: 'global', msg: (lang === 'zh' ? '更新失败: ' : 'Update failed: ') + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickLogout = () => {
    onLogout();
  };

  return (
    <div className={`h-full flex flex-col font-sans overflow-y-auto no-scrollbar pb-32 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
      <div className={`px-6 pt-8 pb-4 flex items-center justify-between shrink-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white'}`}>
        <button 
          onClick={onBack} 
          className={`p-2.5 rounded-full shadow-sm border active:scale-90 transition-all ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-gray-400 border-gray-100'}`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-black uppercase tracking-[0.3em] leading-none ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-300'}`}>Settings</span>
          <span className={`text-[12px] font-black mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</span>
        </div>
        <div className="w-11"></div>
      </div>

      <div className={`px-6 py-10 mb-2 shrink-0 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)]'}`}>
        <div className="flex flex-col items-center mb-10">
          <div 
            className={`relative group cursor-pointer active:scale-95 transition-transform ${fieldError?.field === 'avatar' ? 'animate-shake' : ''}`}
            onClick={handleAvatarClick}
          >
            <div className={`w-24 h-24 rounded-full border-2 p-1 overflow-hidden transition-all shadow-2xl ${fieldError?.field === 'avatar' ? 'border-red-500' : 'border-white/10 group-hover:border-purple-500'}`}>
              <img src={formData.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <ImageIcon size={24} className="text-white" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-purple-500 p-2 rounded-full border-2 border-white shadow-lg">
              <Camera size={14} className="text-white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          {saveSuccess && (
            <div className="mt-4 px-4 py-1.5 bg-green-500/10 text-green-600 rounded-full text-[10px] font-bold border border-green-500/20 animate-bounce">
              {t.success}
            </div>
          )}
          {fieldError?.field === 'avatar' && (
            <p className="mt-3 text-[10px] text-red-500 font-bold uppercase tracking-widest">{fieldError.msg}</p>
          )}
          <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.avatarHint}</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.nickname}</label>
              <span className={`text-[10px] font-mono ${formData.nickname.length > 12 ? 'text-red-500' : 'text-gray-400'}`}>{formData.nickname.length}/12</span>
            </div>
            <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50'}`}>
              <User size={18} className="text-gray-400 mr-3" />
              <input 
                type="text" 
                className={`bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-gray-300 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} 
                placeholder={t.nickname}
                value={formData.nickname} 
                onChange={(e) => { setFormData({...formData, nickname: e.target.value}); setFieldError(null); }} 
              />
            </div>
            {fieldError?.field === 'nickname' && <p className="text-[10px] text-red-400 px-1 font-bold">{fieldError.msg}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.bio}</label>
              <span className={`text-[10px] font-mono ${formData.bio.length > 50 ? 'text-red-500' : 'text-gray-400'}`}>{formData.bio.length}/50</span>
            </div>
            <div className={`flex items-start rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50'}`}>
              <FileText size={18} className="text-gray-400 mr-3 mt-1" />
              <textarea 
                className={`bg-transparent border-none focus:ring-0 text-sm w-full h-24 resize-none leading-relaxed placeholder:text-gray-300 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} 
                placeholder={t.bioPlaceholder}
                value={formData.bio} 
                onChange={(e) => { setFormData({...formData, bio: e.target.value}); setFieldError(null); }} 
              />
            </div>
            {fieldError?.field === 'bio' && <p className="text-[10px] text-red-400 px-1 font-bold">{fieldError.msg}</p>}
          </div>
        </div>

        <div className="mt-10">
          {fieldError?.field === 'global' && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/5 p-4 rounded-xl mb-4 border border-red-100">
              <AlertCircle size={16} />
              <span className="text-xs font-bold">{fieldError.msg}</span>
            </div>
          )}

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className={`w-full h-16 rounded-2xl flex items-center justify-center space-x-3 font-black text-lg transition-all ${isSaving ? 'bg-gray-100 text-gray-400' : 'purple-gradient shadow-2xl shadow-purple-500/30 active:scale-95 text-white'}`}
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            <span>{isSaving ? t.saving : t.save}</span>
          </button>
        </div>
      </div>

      <div className="px-6 mt-8 space-y-4">
        <button 
          onClick={handleQuickLogout}
          className="w-full h-14 rounded-2xl bg-red-500 text-white font-black flex items-center justify-center space-x-2 active:bg-red-600 transition-all shadow-md active:scale-95"
        >
          <LogOut size={18} />
          <span>{t.logout}</span>
        </button>
        
        <button 
          onClick={onBack} 
          className={`w-full h-14 rounded-2xl border font-black uppercase tracking-widest text-xs transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 text-purple-400' : 'bg-white border-gray-100 text-gray-400'}`}
        >
          {t.back}
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default SettingsView;
