
import React, { useState } from 'react';
import { ChevronLeft, MessageCircle, Mail, HelpCircle, Send, CheckCircle2, Loader2, Lock, Sparkles, Headphones, User } from 'lucide-react';
import { db } from '../lib/supabase';
import { collection, addDoc } from '../lib/supabase';
import { translations, LanguageCode } from '../translations';

interface CustomerServiceProps {
  lang: LanguageCode;
  userId: string | null;
  onBack: () => void;
  theme: 'light' | 'dark';
}

const CustomerService: React.FC<CustomerServiceProps> = ({ lang, userId, onBack, theme }) => {
  const t = translations[lang as LanguageCode].service;
  const commonT = translations[lang as LanguageCode].common;
  const [feedback, setFeedback] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) { setFormError(lang === 'zh' ? "请填写您的反馈内容" : "Please enter feedback"); return; }
    if (!userId) return;
    
    setIsSubmitting(true);
    setFormError(null);
    try {
      await addDoc(collection(db, 'feedbacks'), { 
        content: feedback.trim(), 
        contact: contactInfo.trim(),
        user_id: userId,
        created_at: new Date().toISOString()
      });

      setSubmitted(true);
      setFeedback('');
      setContactInfo('');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      console.error("Feedback submission failed:", err);
      setFormError(lang === 'zh' ? `提交失败，请重试` : "Submission failed, please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isGuest = !userId;
  const isButtonDisabled = isSubmitting || isGuest;

  return (
    <div className={`p-6 pb-24 animate-in slide-in-from-right duration-300 h-full overflow-y-auto no-scrollbar transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack} 
            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300' : 'bg-gray-100 text-gray-400'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
        </div>
        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-500/10'}`}>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">{t.online}</span>
        </div>
      </div>

      {/* Main Support Entry */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <button 
          onClick={() => alert(lang === 'zh' ? '专属客服热线：+86 19043870943\n官方微信号：selindell_service' : 'Premium Support Line: +86 19043870943\nOfficial WeChat: selindell_service')}
          className={`p-6 rounded-[32px] flex flex-col items-center space-y-4 border relative group overflow-hidden active:scale-95 transition-all col-span-2 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}
        >
          <div className="absolute top-0 right-0 p-2 bg-purple-500/10 text-purple-400">
            <Sparkles size={10} />
          </div>
          <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 p-1.5 relative shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${theme === 'dark' ? 'bg-purple-950' : 'bg-purple-500/10'}`}>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lynn&backgroundColor=b6e3f4" alt="Lynn" className="w-full h-full object-cover" />
            </div>
            <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-4 rounded-full ${theme === 'dark' ? 'border-[#1a0b2e]' : 'border-white'}`}></div>
          </div>
          <div className="text-center">
            <span className={`font-bold text-sm block mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.human}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>WeChat: selindell_service</span>
          </div>
        </button>
      </div>

      {/* Order Tracking Notice */}
      <div className={`mb-10 p-5 rounded-[24px] border border-dashed flex items-start space-x-4 ${theme === 'dark' ? 'bg-blue-900/10 border-blue-800/30' : 'bg-blue-50/50 border-blue-200'}`}>
        <div className={`p-2 rounded-full shrink-0 ${theme === 'dark' ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
          <HelpCircle size={16} />
        </div>
        <div>
          <h4 className={`text-xs font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
            {lang === 'zh' ? '订单追踪指南' : 'Order Tracking Guide'}
          </h4>
          <p className={`text-[11px] leading-relaxed font-medium ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-800/70'}`}>
            {lang === 'zh' 
              ? '当您下单完成后，如需查看物流状态，请点击左上角返回主菜单，点击右上角齿轮图标进入个人中心，在「我的订单」即可实时查看进度。' 
              : 'To view your logistics status after checkout, return to the main menu and tap the settings icon on the top right to access "Orders" in your profile.'}
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.faq}</h3>
          <span className="text-[9px] text-purple-500/60 font-black uppercase tracking-widest">{t.selfService}</span>
        </div>
        <div className="space-y-3">
          {t.faqItems.map((faq, idx) => (
            <details key={idx} className={`rounded-2xl group border overflow-hidden shadow-sm transition-colors ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
              <summary className={`p-4 list-none flex justify-between items-center cursor-pointer font-bold text-sm ${theme === 'dark' ? 'text-purple-200' : 'text-gray-700'}`}>
                <span>{faq.q}</span>
                <ChevronLeft size={16} className={`-rotate-90 group-open:rotate-90 transition-transform ${theme === 'dark' ? 'text-purple-700' : 'text-gray-300'}`} />
              </summary>
              <div className={`px-5 pb-5 text-xs leading-relaxed border-t pt-4 animate-in fade-in duration-300 ${theme === 'dark' ? 'text-purple-300/60 border-purple-800/30' : 'text-gray-500 border-gray-50'}`}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Feedback Form */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.feedback}</h3>
          <HelpCircle size={12} className={theme === 'dark' ? 'text-purple-700' : 'text-gray-300'} />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`rounded-[32px] p-6 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 focus-within:border-purple-500/50' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/30'}`}>
            <textarea 
              className={`w-full bg-transparent border-none focus:ring-0 text-sm h-32 resize-none leading-relaxed no-scrollbar ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
              placeholder={t.placeholder}
              value={feedback}
              onChange={(e) => { setFeedback(e.target.value); setFormError(null); }}
              disabled={isSubmitting}
            />
          </div>
          <div className={`rounded-[24px] px-5 py-4 border flex items-center space-x-3 transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 focus-within:border-purple-500/50' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/30'}`}>
            <Mail size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
            <input 
              type="text" 
              className={`bg-transparent border-none focus:ring-0 text-sm w-full font-medium ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
              placeholder={t.contact}
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          {formError && (
            <p className="text-xs text-red-400 font-bold px-1 animate-pulse">{formError}</p>
          )}

          <button 
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full h-18 rounded-[28px] flex items-center justify-center space-x-3 font-black transition-all ${
              isButtonDisabled ? (theme === 'dark' ? 'bg-purple-900/40 text-purple-700 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') : 'purple-gradient active:scale-95 shadow-2xl shadow-purple-500/40 text-white'
            }`}
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : submitted ? (
              <CheckCircle2 size={20} />
            ) : isGuest ? (
              <Lock size={18} />
            ) : (
              <Send size={20} />
            )}
            <span className="text-lg">
              {isSubmitting ? t.submitting : submitted ? t.submitSuccess : isGuest ? t.guestHint : t.submitBtn}
            </span>
          </button>
          
          {isGuest && (
            <p className={`text-center text-[10px] font-black uppercase tracking-[0.1em] mt-3 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>
              {t.tip}
            </p>
          )}
        </form>
      </div>

      {/* Support Slogan */}
      <div className="text-center py-6">
        <p className={`text-[9px] font-black uppercase tracking-[0.4em] opacity-50 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-300'}`}>
          Crafted with care by Selindell Ops
        </p>
      </div>
    </div>
  );
};

export default CustomerService;
