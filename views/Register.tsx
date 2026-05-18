
import React, { useState } from 'react';
import { Sparkles, Mail, Lock, Loader2, ArrowRight, User, LogIn, CheckCircle2, ChevronLeft, AlertCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { translations, LanguageCode } from '../translations';

interface RegisterProps {
  lang: LanguageCode;
  onRegisterSuccess: (nickname: string) => void;
  onBack: () => void;
  theme?: 'light' | 'dark';
}

const Register: React.FC<RegisterProps> = ({ lang, onRegisterSuccess, onBack, theme = 'light' }) => {
  const t = translations[lang as LanguageCode].register;
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorHint(null);
    if (!email.trim()) { setErrorHint(t.emailRequired); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrorHint(t.emailInvalid); return; }
    if (!password.trim()) { setErrorHint(t.passwordRequired); return; }
    if (password.length < 6) { setErrorHint(t.passwordTooShort); return; }
    
    setIsSubmitting(true);
    
    let isNewUser = false;
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("请求超时：数据库可能处于休眠状态，请联系管理员唤醒。")), 15000)
      );

      let finalUserId: string = '';
      let finalNickname = nickname.trim();
      let existingAvatar: string | null = null;
      let existingBio: string | null = null;

      if (isLoginMode) {
        const authPromise = signInWithEmailAndPassword(auth, email.trim(), password.trim())
            .then(cred => ({ data: { user: cred.user }, error: null }))
            .catch(error => ({ data: null, error }));
        const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (error) throw error;
        if (!data?.user) throw new Error("登录失败：未获取到用户信息。");
        
        finalUserId = data.user.uid;
        
        const profileSnap = await getDoc(doc(db, 'users', finalUserId));
        
        if (profileSnap.exists()) {
          const profile = profileSnap.data();
          finalNickname = profile.nickname || (lang === 'zh' ? '用户' : 'User');
          existingAvatar = profile.avatar;
          existingBio = profile.bio;
        }
        setSuccessMsg(t.successLogin);
      } else {
        if (!finalNickname) {
          setErrorHint(t.nicknameRequired);
          setIsSubmitting(false);
          return;
        }

        const signUpPromise = createUserWithEmailAndPassword(auth, email.trim(), password.trim()).then(cred => ({ data: { user: cred.user }, error: null })).catch(error => ({ data: null, error }));
        const { data, error: signUpError } = await Promise.race([signUpPromise, timeoutPromise]) as any;
        
        if (signUpError) {
          const loginPromise = signInWithEmailAndPassword(auth, email.trim(), password.trim()).then(cred => ({ data: { user: cred.user }, error: null })).catch(error => ({ data: null, error }));
          const { data: loginData, error: loginError } = await Promise.race([loginPromise, timeoutPromise]) as any;
          
          if (loginError) throw signUpError;
          if (!loginData?.user) throw new Error("登录失败：未获取到用户信息。");
          
          finalUserId = loginData.user.uid;
          const oldProfileSnap = await getDoc(doc(db, 'users', finalUserId));
          if (oldProfileSnap.exists()) {
            const oldProfile = oldProfileSnap.data();
            existingAvatar = oldProfile.avatar;
            existingBio = oldProfile.bio;
          }
          setSuccessMsg(t.successLogin);
        } else {
          if (!data?.user) throw new Error("注册失败：请检查邮箱是否需要验证，或联系管理员。");
          finalUserId = data.user.uid;
          isNewUser = true;
          setSuccessMsg(t.successReg);
        }
      }

      if (finalUserId) {
        // 1. Create User Profile
        await setDoc(doc(db, 'users', finalUserId), {
          id: finalUserId,
          nickname: finalNickname || (lang === 'zh' ? '造物主' : 'Creator'),
          avatar: existingAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalNickname || finalUserId}`,
          bio: existingBio || (lang === 'zh' ? '欢迎来到造物世界' : 'Welcome to the Forge')
        }, { merge: true });

        // 2. Welcome Notification (Smarter Logic)
        const notificationsRef = collection(db, 'notifications');
        const welcomeQuery = query(notificationsRef, where('target_user_id', '==', finalUserId), where('title', 'in', [
          lang === 'zh' ? '欢迎来到 selindell' : 'Welcome to selindell',
          '欢迎来到 selindell',
          'Welcome to selindell'
        ]));
        const welcomeSnap = await getDocs(welcomeQuery);
        
        if (isNewUser && welcomeSnap.empty) {
          await addDoc(notificationsRef, {
            target_user_id: finalUserId,
            title: lang === 'zh' ? '欢迎来到 selindell' : 'Welcome to selindell',
            content: lang === 'zh' ? '你好造物主，欢迎来到 selindell！在这里开启你的创作之旅。' : 'Hello Creator, welcome to selindell! Start your creative journey here.',
            is_active: true,
            is_read: false,
            created_at: new Date().toISOString()
          });
        } else if (!isNewUser) {
          // Check if we already sent a "Welcome back" very recently (e.g., in the last 12 hours)
          const backQuery = query(notificationsRef, 
            where('target_user_id', '==', finalUserId), 
            where('title', 'in', [lang === 'zh' ? '欢迎回来' : 'Welcome back', '欢迎回来', 'Welcome back'])
          );
          const backSnap = await getDocs(backQuery);
          const recentBack = backSnap.docs.some(doc => {
            const data = doc.data();
            if (!data.created_at) return false;
            const diff = Date.now() - new Date(data.created_at).getTime();
            return diff < 12 * 60 * 60 * 1000; // 12 hours
          });

          if (!recentBack) {
            await addDoc(notificationsRef, {
              target_user_id: finalUserId,
              title: lang === 'zh' ? '欢迎回来' : 'Welcome back',
              content: lang === 'zh' ? '很高兴再次见到你，造物主！准备好开始新的创作了吗？' : 'Great to see you again, Creator! Ready for something new?',
              is_active: true,
              is_read: false,
              created_at: new Date().toISOString()
            });
          }
        }
      }
      
      setTimeout(() => {
        onRegisterSuccess(finalNickname);
      }, 1500);

    } catch (err: any) {
      setErrorHint(err.message);
      setIsSubmitting(false);
    }
  };


  const handleGoogleLogin = async () => {
    try {
      setErrorHint(null);
      setIsSubmitting(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      let finalNickname = user.displayName || (lang === 'zh' ? '用户' : 'User');
      let existingAvatar = user.photoURL;
      
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      let isNewUser = false;
      
      const notificationsRef = collection(db, 'notifications');
      
      if (!profileSnap.exists()) {
        isNewUser = true;
        // 1. Create User Profile
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          nickname: finalNickname,
          avatar: existingAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalNickname || user.uid}`,
          bio: (lang === 'zh' ? '欢迎来到造物世界' : 'Welcome to the Forge')
        });

        // 2. Welcome Notification (Check if ever sent)
        const welcomeQuery = query(notificationsRef, where('target_user_id', '==', user.uid), where('title', 'in', [
          lang === 'zh' ? '欢迎来到 selindell' : 'Welcome to selindell',
          '欢迎来到 selindell',
          'Welcome to selindell'
        ]));
        const welcomeSnap = await getDocs(welcomeQuery);

        if (welcomeSnap.empty) {
          await addDoc(notificationsRef, {
            target_user_id: user.uid,
            title: lang === 'zh' ? '欢迎来到 selindell' : 'Welcome to selindell',
            content: lang === 'zh' ? '你好造物主，欢迎来到 selindell！在这里开启你的创作之旅。' : 'Hello Creator, welcome to selindell! Start your creative journey here.',
            is_active: true,
            is_read: false,
            created_at: new Date().toISOString()
          });
        }
        setSuccessMsg(t.successReg);
      } else {
        const data = profileSnap.data() as any;
        finalNickname = data.nickname || finalNickname;
        
        // Welcome back notification for Google Login (Returning User - check if recent)
        const backQuery = query(notificationsRef, 
          where('target_user_id', '==', user.uid), 
          where('title', 'in', [lang === 'zh' ? '欢迎回来' : 'Welcome back', '欢迎回来', 'Welcome back'])
        );
        const backSnap = await getDocs(backQuery);
        const recentBack = backSnap.docs.some(doc => {
          const data = doc.data();
          if (!data.created_at) return false;
          const diff = Date.now() - new Date(data.created_at).getTime();
          return diff < 12 * 60 * 60 * 1000; // 12 hours
        });

        if (!recentBack) {
          await addDoc(notificationsRef, {
            target_user_id: user.uid,
            title: lang === 'zh' ? '欢迎回来' : 'Welcome back',
            content: lang === 'zh' ? '很高兴再次见到你，造物主！准备好开始新的创作了吗？' : 'Great to see you again, Creator! Ready for something new?',
            is_active: true,
            is_read: false,
            created_at: new Date().toISOString()
          });
        }
        
        setSuccessMsg(t.successLogin);
      }
      
      setTimeout(() => {
        onRegisterSuccess(finalNickname);
      }, 1500);
      
    } catch (err: any) {
      console.error(err);
      setErrorHint(err.message || 'Google Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white'}`}>
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-bounce ${theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-50'}`}>
          <CheckCircle2 className="text-purple-600" size={48} />
        </div>
        <h2 className={`text-3xl font-black mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{successMsg}</h2>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em]">{t.securing}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 relative ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-white'}`}>
      <div className="absolute top-8 left-6">
        <button 
          onClick={onBack} 
          className={`p-3 rounded-full border active:scale-90 transition-transform ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50' : 'bg-gray-50 border-gray-100'}`}
        >
          <ChevronLeft size={24} className={theme === 'dark' ? 'text-purple-300' : 'text-gray-400'} />
        </button>
      </div>

      <div className="mb-10 relative mt-4">
        <div className={`w-24 h-24 rounded-[40px] flex items-center justify-center border relative shadow-sm ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50' : 'bg-purple-50 border-purple-100'}`}>
          <Sparkles className="text-purple-600 animate-pulse" size={40} />
        </div>
      </div>

      <h1 className={`text-3xl font-black mb-3 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{isLoginMode ? t.welcomeLogin : t.startJourney}</h1>
      <p className={`text-sm mb-10 leading-relaxed max-w-[240px] font-medium ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-400'}`}>{isLoginMode ? t.loginSub : t.registerSub}</p>

      <div className="w-full max-w-sm space-y-4">
        {!isLoginMode && (
          <div className={`rounded-2xl p-4.5 flex items-center border transition-all shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-200 focus-within:bg-white'}`}>
            <User size={20} className="text-gray-400 mr-3" />
            <input 
              type="text" 
              placeholder={t.nickname}
              className={`bg-transparent border-none focus:ring-0 w-full text-sm font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-300/30' : 'text-gray-900'}`}
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setErrorHint(null); }}
            />
          </div>
        )}

        <div className={`rounded-2xl p-4.5 flex items-center border transition-all shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-200 focus-within:bg-white'}`}>
          <Mail size={20} className="text-gray-400 mr-3" />
          <input 
            type="email" 
            placeholder={t.email}
            className={`bg-transparent border-none focus:ring-0 w-full text-sm font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-300/30' : 'text-gray-900'}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorHint(null); }}
          />
        </div>

        <div className={`rounded-2xl p-4.5 flex items-center border transition-all shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-200 focus-within:bg-white'}`}>
          <Lock size={20} className="text-gray-400 mr-3" />
          <input 
            type="password" 
            placeholder={t.password}
            className={`bg-transparent border-none focus:ring-0 w-full text-sm font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-300/30' : 'text-gray-900'}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrorHint(null); }}
          />
        </div>

        {errorHint && (
          <div className={`flex items-center space-x-2 p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-300 ${theme === 'dark' ? 'text-red-400 bg-red-900/20 border-red-900/50' : 'text-red-500 bg-red-50 border-red-100'}`}>
            <AlertCircle size={14} className="shrink-0" />
            <span className="text-[11px] font-bold text-left">{errorHint}</span>
          </div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-18 rounded-2xl purple-gradient flex items-center justify-center space-x-3 font-black text-lg shadow-2xl shadow-purple-500/20 active:scale-95 transition-all text-white mt-4"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (isLoginMode ? <LogIn size={20} /> : <ArrowRight size={20} />)}
          <span>{isSubmitting ? t.checking : (isLoginMode ? t.submitLogin : t.submitRegister)}</span>
        </button>

        <button 
          onClick={() => { setIsLoginMode(!isLoginMode); setErrorHint(null); }}
          className={`w-full py-4 text-xs font-black hover:text-purple-600 transition-colors uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-purple-300/40' : 'text-slate-400'}`}
        >
          {isLoginMode ? t.toggleToReg : t.toggleToLogin}
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t w-full border-gray-200 dark:border-gray-800"></div>
          <span className={`px-3 text-xs absolute ${theme === 'dark' ? 'bg-[#1a0b2e] text-purple-300/40' : 'bg-white text-slate-400'}`}>
            {lang === 'zh' ? '或者' : 'OR'}
          </span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className={`w-full h-14 rounded-2xl flex items-center justify-center space-x-3 font-bold text-sm border transition-all active:scale-95 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 text-white hover:bg-purple-900/40' : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{lang === 'zh' ? '使用 Google 登录' : 'Continue with Google'}</span>
        </button>
      </div>

      <div className={`mt-16 text-[9px] font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-purple-900/60' : 'text-slate-300'}`}>
        {t.securedBy}
      </div>
    </div>
  );
};

export default Register;
