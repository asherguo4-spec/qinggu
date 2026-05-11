
import React, { useState, useEffect, useRef } from 'react';
import { AppView, GeneratedCreation, Address, UserProfile, UserLevel } from './types';
import Home from './views/Home';
import Orders from './views/Orders';
import Profile from './views/Profile';
import Favorites from './views/Favorites';
import Messages from './views/Messages';
import Checkout from './views/Checkout';
import AddressList from './views/AddressList';
import CustomerService from './views/CustomerService';
import SettingsView from './views/Settings';
import Register from './views/Register';
import AboutUs from './views/AboutUs';
import OrderDetail from './views/OrderDetail';
import { auth, db, logAction } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc, setDoc, deleteDoc, addDoc, count, updateDoc } from 'firebase/firestore';
import { translations, LanguageCode } from './translations';
import { Globe, ChevronDown, Home as HomeIcon, Compass, ShoppingBag, User as UserIcon, Sun, Moon, MessageSquare, Menu, X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';


const App: React.FC = () => {
  // 1. 所有的 Hook 必须放在组件的最顶部，绝对不能放在任何 if 之后
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [myCreations, setMyCreations] = useState<GeneratedCreation[]>([]);
  const [pendingOrder, setPendingOrder] = useState<GeneratedCreation | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<GeneratedCreation | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [lang, setLang] = useState<LanguageCode>('zh');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const [activePolicy, setActivePolicy] = useState<string | null>(null);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);

  const trackEvent = (eventName: string, params?: any) => {
    console.log(`[Track] ${eventName}`, params);
    // In a real app, this would send data to your analytics service
  };

  const toggleMenu = (open: boolean) => {
    setIsMenuOpen(open);
    if (open) {
      trackEvent('open_menu');
    } else {
      trackEvent('close_menu');
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Focus first item for accessibility
      setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 300);
    } else {
      document.body.style.overflow = 'unset';
      // Return focus to hamburger
      if (document.activeElement !== hamburgerRef.current) {
        hamburgerRef.current?.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        toggleMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { 
      document.body.style.overflow = 'unset'; 
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const languageNames: Record<string, string> = {
    zh: '简体中文'
  };

  const t = translations['zh'];
  const navT = t.nav || { home: '3d工作台', square: '探索', orders: '订单', profile: '我的' };

  const policies: Record<string, any> = {
    terms: { title: 'Terms', content: 'Terms...' },
    privacy: { title: 'Privacy', content: 'Privacy...' },
    refund: { title: 'Refund', content: 'Refund...' }
  };

  const generateShortId = (id: string) => {
    if (!id) return '00000000';
    return id.substring(0, 8).toUpperCase();
  };

  const getDefaultProfile = (id: string | null): UserProfile => ({
    id: id || '',
    shortId: generateShortId(id || ''),
    nickname: id ? (lang === 'zh' ? '加载中...' : 'Loading...') : (lang === 'zh' ? '欢迎' : 'Welcome'),
    avatar: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${id || 'guest'}`,
    email: '',
    bio: id ? (lang === 'zh' ? '正在获取用户信息...' : 'Fetching profile...') : (lang === 'zh' ? '探索您的3d工作台' : 'Explore your 3D workbench'),
    isRegistered: !!id,
    level: 'visitor',
    orderCount: 0
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(getDefaultProfile(null));
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      const forceEndLoading = setTimeout(() => setIsLoadingProfile(false), 2000);
      try {
        await auth.authStateReady();
        await handleAuthChange(auth.currentUser);
      } catch (e) {
        console.warn("Auth initialization failed, using guest mode", e);
      } finally {
        clearTimeout(forceEndLoading);
        setIsLoadingProfile(false);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      handleAuthChange(user).catch(e => console.warn("Auth change handler failed", e));
    });

    // Handle redirect from Whop
    if (window.location.pathname === '/order-success' || window.location.pathname === '/success') {
      setCurrentView(AppView.SUCCESS);
      window.history.replaceState({}, document.title, '/');
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#1a0b2e' : '#F8F9FB';
  }, [theme]);

  const handleAuthChange = async (user: User | null) => {
    if (user) {
      const uid = user.uid;
      setUserId(uid);
      
      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('user_id', '==', uid)));
      const currentOrderCount = ordersSnap.size || 0;
      setOrderCount(currentOrderCount);
      const level: UserLevel = currentOrderCount > 0 ? 'elite' : 'creator';
      
      const profileSnap = await getDoc(doc(db, 'users', uid));
      const profileData = profileSnap.data();

      if (profileSnap.exists() && profileData) {
        setUserProfile({
          id: uid,
          shortId: generateShortId(uid),
          nickname: profileData.nickname,
          bio: profileData.bio || (lang === 'zh' ? '欢迎回来' : 'Welcome back'),
          avatar: profileData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.nickname}`,
          email: user.email || '',
          isRegistered: true,
          level: level,
          orderCount: currentOrderCount
        });
      } else {
        setUserProfile({
          ...getDefaultProfile(uid),
          level: level,
          orderCount: currentOrderCount
        });
      }

      const addrSnap = await getDocs(query(collection(db, 'addresses'), where('user_id', '==', uid)));
      if (!addrSnap.empty) {
        setAddresses(addrSnap.docs.map((d) => ({
          id: d.id, userId: d.data().user_id, name: d.data().name, phone: d.data().phone, location: d.data().location, isDefault: d.data().is_default
        })));
      }

      // Fetch unread notifications count
      try {
        const notifsSnap = await getDocs(query(collection(db, 'notifications'), where('target_user_id', '==', uid), where('is_active', '!=', false)));
        const readNotifs = JSON.parse(localStorage.getItem('read_notifications') || '[]');
        const actualUnread = notifsSnap.docs.filter(n => !n.data().is_read && !readNotifs.includes(n.id));
        setUnreadMessages(actualUnread.length);
      } catch (e) {
        setUnreadMessages(0);
      }
    } else {
      setUserId(null);
      setUserProfile(getDefaultProfile(null));
      setAddresses([]);
      setOrderCount(0);
      setUnreadMessages(0);
    }
  };

  const handleRegisterSuccess = () => {
    handleAuthChange(auth.currentUser);
    if (pendingOrder) setCurrentView(AppView.RESULT);
    else setCurrentView(AppView.PROFILE);
  };

  const handleLogout = async () => {
    try {
      if (userId) await logAction(userId, 'LOGOUT');
      await signOut(auth);
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
      // Fallback reload even if error
      window.location.reload();
    }
  };

  const handleCreationSuccess = (creation: GeneratedCreation) => {
    setMyCreations(prev => [creation, ...prev]);
  };

  const handlePaymentComplete = (creationId: string, guestEmail?: string) => {
    setMyCreations(prev => prev.map(c => c.id === creationId ? { ...c, status: 'paid' as const } : c));
    setOrderCount(prev => prev + 1);
    if (userId) {
      setUserProfile(prev => ({ ...prev, orderCount: prev.orderCount + 1, level: 'elite' }));
      // We need to fetch the doc ID to delete it
      getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId), where('design_id', '==', creationId)))
        .then(snap => {
           snap.forEach(docSnap => deleteDoc(docSnap.ref));
        });
    }
    setPendingOrder(null);
    setCurrentView(AppView.ORDERS);
  };

  const addAddress = async (newAddr: Omit<Address, 'id' | 'isDefault' | 'userId'>) => {
    if (!userId) return;
    try {
      const docRef = await addDoc(collection(db, 'addresses'), {
        user_id: userId, name: newAddr.name, phone: newAddr.phone, location: newAddr.location, is_default: addresses.length === 0
      });
      setAddresses(prev => [...prev, {
        id: docRef.id, userId: userId, name: newAddr.name, phone: newAddr.phone, location: newAddr.location, isDefault: addresses.length === 0
      }]);
    } catch (err: any) { alert(lang === 'zh' ? `保存失败: ${err.message}` : `Save failed: ${err.message}`); }
  };

  const deleteAddress = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'addresses', id));
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err: any) { alert(lang === 'zh' ? `删除失败: ${err.message}` : `Delete failed: ${err.message}`); }
  };

  const handleProfileUpdate = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
    setCurrentView(AppView.PROFILE);
  };

  // 3. 将 renderView 改为在 JSX 中直接渲染，或者确保它不包含逻辑判断导致的 Hook 缺失
  const renderContent = () => {
    if (isLoadingProfile) {
      return (
        <div className="w-full h-[80vh] flex flex-col items-center justify-center">
          <div className="loader-dot mb-8"></div>
          <p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase">{t.common?.loading || 'LOADING'}</p>
        </div>
      );
    }

    switch (currentView) {
      case AppView.REGISTER: return <Register lang={lang} onRegisterSuccess={handleRegisterSuccess} onBack={() => setCurrentView(AppView.PROFILE)} theme={theme} />;
      case AppView.HOME:
      case AppView.SQUARE: 
      case AppView.GENERATING:
      case AppView.RESULT:
        return <Home currentView={currentView} setView={setCurrentView} onCreationSuccess={handleCreationSuccess} setPendingOrder={setPendingOrder} userId={userId} lang={lang} setLang={setLang} theme={theme} />;
      case AppView.SUCCESS:
      return (
        <div className={`flex flex-col items-center justify-center min-h-[80vh] p-8 text-center animate-in zoom-in duration-700 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : ''}`}>
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-green-400/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
            <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-600 rounded-[40px] flex items-center justify-center relative shadow-2xl shadow-green-200 rotate-3 hover:rotate-0 transition-transform duration-500">
              <CheckCircle2 className="text-white" size={64} />
            </div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-2xl">🎉</span>
            </div>
          </div>
          
          <h2 className={`text-5xl font-black mb-6 tracking-tighter leading-none ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {lang === 'zh' ? '支付成功！' : 'PAYMENT SUCCESSFUL!'}
          </h2>
          
          <div className="max-w-sm mx-auto space-y-4 mb-12">
            <p className={`font-medium leading-relaxed ${theme === 'dark' ? 'text-purple-200/60' : 'text-gray-500'}`}>
              {lang === 'zh' ? '您的订单已确认，我们将尽快为您处理。' : 'Your order has been confirmed and will be processed shortly.'}
            </p>
          </div>

          <button 
            onClick={() => setCurrentView(AppView.HOME)}
            className="group flex flex-col items-center space-y-4 active:scale-95 transition-all"
          >
             <div className="flex space-x-2">
               <div className={`w-2 h-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-purple-800 group-hover:bg-purple-400' : 'bg-gray-300 group-hover:bg-purple-500'}`}></div>
               <div className={`w-2 h-2 rounded-full transition-colors delay-75 ${theme === 'dark' ? 'bg-purple-800 group-hover:bg-purple-400' : 'bg-gray-300 group-hover:bg-purple-500'}`}></div>
               <div className={`w-2 h-2 rounded-full transition-colors delay-150 ${theme === 'dark' ? 'bg-purple-800 group-hover:bg-purple-400' : 'bg-gray-300 group-hover:bg-purple-500'}`}></div>
             </div>
             <p className={`text-[11px] font-black uppercase tracking-[0.4em] transition-colors ${theme === 'dark' ? 'text-purple-500/60 group-hover:text-purple-400' : 'text-gray-400 group-hover:text-purple-600'}`}>
               {lang === 'zh' ? '点击返回主页' : 'CLICK TO RETURN HOME'}
             </p>
          </button>
        </div>
      );
    case AppView.CHECKOUT:
        return pendingOrder ? (
          <Checkout lang={lang} userId={userId} creation={pendingOrder} addresses={addresses} onPaymentComplete={handlePaymentComplete} onBack={() => setCurrentView(AppView.RESULT)} theme={theme} onLoginRequest={() => setCurrentView(AppView.REGISTER)} />
        ) : (
          <Home currentView={AppView.HOME} setView={setCurrentView} onCreationSuccess={handleCreationSuccess} setPendingOrder={setPendingOrder} userId={userId} lang={lang} setLang={setLang} theme={theme} />
        );
      case AppView.ORDERS:
        return <Orders lang={lang} userId={userId || ''} creations={[]} setView={setCurrentView} theme={theme} onSelectOrder={(order) => { setSelectedOrder(order); setCurrentView(AppView.ORDER_DETAIL); }} />;
      case AppView.ORDER_DETAIL:
        return selectedOrder ? <OrderDetail lang={lang} order={selectedOrder} onBack={() => setCurrentView(AppView.ORDERS)} theme={theme} userId={userId || ''} /> : null;
      case AppView.PROFILE:
        return <Profile lang={lang} setView={setCurrentView} userProfile={userProfile} onLogout={handleLogout} theme={theme} />;
      case AppView.FAVORITES:
        return <Favorites lang={lang} userId={userId || ''} setView={setCurrentView} theme={theme} onSelectDesign={(design) => { setPendingOrder(design); setCurrentView(AppView.CHECKOUT); }} />;
      case AppView.MESSAGES:
        return <Messages lang={lang} theme={theme} userId={userId} onRead={() => setUnreadMessages(prev => Math.max(0, prev - 1))} />;
      case AppView.ADDRESS_LIST:
        return <AddressList lang={lang} addresses={addresses} onAddAddress={addAddress} onDeleteAddress={deleteAddress} onBack={() => setCurrentView(AppView.PROFILE)} theme={theme} />;
      case AppView.CUSTOMER_SERVICE:
        return <CustomerService lang={lang} userId={userId || ''} onBack={() => setCurrentView(AppView.PROFILE)} theme={theme} />;
      case AppView.SETTINGS:
        return userId ? <SettingsView lang={lang} userId={userId} profile={userProfile} onUpdate={handleProfileUpdate} onBack={() => setCurrentView(AppView.PROFILE)} onLogout={handleLogout} theme={theme} /> : null;
      case AppView.ABOUT_US:
        return <AboutUs lang={lang} onBack={() => setCurrentView(AppView.PROFILE)} theme={theme} />;
      default: return <Home currentView={currentView} setView={setCurrentView} onCreationSuccess={handleCreationSuccess} setPendingOrder={setPendingOrder} userId={userId} lang={lang} setLang={setLang} theme={theme} />;
    }
  };

  return (
    <div className={`min-h-[100dvh] relative flex flex-col items-center transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-6xl flex flex-col min-h-[100dvh] relative overflow-x-hidden">
        {![AppView.CHECKOUT, AppView.ADDRESS_LIST, AppView.CUSTOMER_SERVICE, AppView.SETTINGS, AppView.REGISTER, AppView.ABOUT_US].includes(currentView) && !isLoadingProfile && (
          <header className={`h-20 px-6 md:px-12 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md shrink-0 border-b transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]/40 border-purple-900/30' : 'bg-white/40 border-gray-100/50'}`}>
            {/* Mobile Header Layout */}
            <div className="flex md:hidden items-center justify-between w-full">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]"></div>
                <span className={`text-xl font-black tracking-tighter italic bg-clip-text text-transparent uppercase ${theme === 'dark' ? 'bg-gradient-to-r from-purple-200 to-purple-400' : 'bg-gradient-to-r from-gray-900 to-gray-600'}`}>SELINDELL</span>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={`flex items-center space-x-0.5 pl-2 pr-1 py-1.5 rounded-full border transition-all active:scale-95 ${theme === 'dark' ? 'bg-purple-900/60 border-purple-700/50' : 'bg-white border-gray-200'}`}
                >
                  {theme === 'dark' ? <Moon size={14} className="text-purple-300" /> : <Sun size={14} className="text-amber-500" />}
                  <ChevronDown size={12} className={theme === 'dark' ? 'text-purple-400/70' : 'text-slate-400/70'} />
                </button>
                <button 
                  ref={hamburgerRef}
                  onClick={() => toggleMenu(!isMenuOpen)}
                  className="p-2.5 rounded-full transition-all active:scale-95 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/30 border-none"
                >
                  {isMenuOpen ? <X size={22} className="text-white" /> : <Menu size={22} className="text-white" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Overlay and Drawer moved outside header */}
            {/* PC Header Layout (Nav Center, Tools Right) */}
            <div className="hidden md:flex items-center justify-between w-full h-full relative">
              {/* Left side (empty) */}
              <div className="flex-1"></div>

              {/* Nav Center - Text Only Buttons */}
              <div className="flex items-center space-x-10">
                {[
                  { id: AppView.HOME, label: navT.home },
                  { id: AppView.SQUARE, label: navT.square },
                  { id: AppView.MESSAGES, label: navT.messages, badge: unreadMessages },
                  { id: AppView.ORDERS, label: navT.orders },
                  { id: AppView.PROFILE, label: navT.profile },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`relative px-1 py-2 text-sm font-bold transition-all hover:opacity-80 ${currentView === item.id ? 'text-purple-500' : theme === 'dark' ? 'text-purple-200' : 'text-slate-600'}`}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="absolute -top-1 -right-4 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                    ) : null}
                    {currentView === item.id && (
                      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-full"></div>
                    )}
                  </button>
                ))}
              </div>

              {/* Tools Right */}
              <div className="flex-1 flex justify-end items-center space-x-6 relative z-20">
                <button 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className={`p-2.5 rounded-full border transition-all active:scale-95 ${theme === 'dark' ? 'bg-purple-900/60 border-purple-700/50 hover:bg-purple-800/60' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                  {theme === 'dark' ? <Moon size={18} className="text-purple-300" /> : <Sun size={18} className="text-amber-500" />}
                </button>
              </div>
            </div>
          </header>
        )}

        {/* Mobile Menu Overlay & Drawer (Moved outside header to fix stacking context) */}
        <div className={`fixed inset-0 z-[100] bg-black/80 md:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => toggleMenu(false)} />
        <div 
          className={`fixed inset-y-0 right-0 z-[110] md:hidden w-[80%] shadow-2xl transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ backgroundColor: theme === 'dark' ? '#1a0b2e' : '#ffffff' }}
        >
          <div className="flex justify-end p-4">
            <button onClick={() => toggleMenu(false)} className="p-2">
              <X size={28} className={theme === 'dark' ? 'text-gray-300' : 'text-gray-800'} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex flex-col px-6 mt-2">
            {[
              { id: AppView.HOME, label: navT.home, hasChevron: true },
              { id: AppView.SQUARE, label: navT.square, hasChevron: true },
              { id: AppView.MESSAGES, label: navT.messages, hasChevron: true },
              { id: AppView.ORDERS, label: navT.orders, hasChevron: true },
              { id: AppView.PROFILE, label: navT.profile, hasChevron: true },
            ].map((item, index) => (
              <button
                key={item.id}
                ref={index === 0 ? firstMenuItemRef : null}
                onClick={() => { 
                  setCurrentView(item.id); 
                  toggleMenu(false); 
                  trackEvent('click_menu_item', { item_id: item.id });
                }}
                className={`flex items-center justify-between py-4 min-h-[48px] border-b ${theme === 'dark' ? 'border-gray-800 text-gray-200' : 'border-gray-200 text-gray-800'} text-lg`}
              >
                <span>{item.label}</span>
                {item.hasChevron && <ChevronRight size={20} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />}
              </button>
            ))}
          </div>
        </div>

        <main className={`flex-1 overflow-y-auto no-scrollbar relative w-full px-4 md:px-8 lg:px-12 max-w-5xl mx-auto ${[AppView.HOME, AppView.SQUARE, AppView.ORDERS, AppView.PROFILE, AppView.RESULT].includes(currentView) ? 'pb-24 md:pb-12' : ''}`}>
          {renderContent()}
          
          <footer className={`w-full py-12 mt-12 border-t transition-colors duration-500 ${theme === 'dark' ? 'border-purple-900/20' : 'border-gray-100/50'}`}>
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <button onClick={() => setActivePolicy('terms')} className={theme === 'dark' ? 'text-purple-300' : 'text-gray-600'}>{lang === 'zh' ? '服务条款' : 'Terms'}</button>
                <button onClick={() => setActivePolicy('privacy')} className={theme === 'dark' ? 'text-purple-300' : 'text-gray-600'}>{lang === 'zh' ? '隐私政策' : 'Privacy'}</button>
                <button onClick={() => setActivePolicy('refund')} className={theme === 'dark' ? 'text-purple-300' : 'text-gray-600'}>{lang === 'zh' ? '退款政策' : 'Refund'}</button>
                <button onClick={() => setIsDisclaimerOpen(true)} className={theme === 'dark' ? 'text-purple-300' : 'text-gray-600'}>{lang === 'zh' ? '免责声明' : 'Disclaimer'}</button>
              </div>
              <div className={`text-[10px] font-medium tracking-wider uppercase ${theme === 'dark' ? 'text-purple-400/30' : 'text-gray-400/60'}`}>
                © 2024-2026 跃壹知品（郑州）科技有限公司 | YUONE
              </div>
              <div className={`text-[9px] font-medium tracking-wide ${theme === 'dark' ? 'text-purple-500/20' : 'text-gray-400/40'}`}>
                地址：中国河南省郑州市航空港区青禾众创 | 邮编：451162
              </div>
            </div>
          </footer>
          {/* 条款弹窗 */}
          {activePolicy && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/50">
              <div className={`w-full max-w-lg max-h-[80vh] rounded-[32px] p-8 border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#2d1b4e] border-purple-800/50 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <button onClick={() => setActivePolicy(null)} className="flex items-center space-x-2 text-sm font-bold">
                    <ChevronLeft size={20} />
                    <span>{lang === 'zh' ? '返回' : 'Back'}</span>
                  </button>
                </div>
                <h2 className="text-2xl font-black mb-4 shrink-0">{policies[activePolicy as keyof typeof policies].title}</h2>
                <div className="overflow-y-auto pr-2 no-scrollbar">
                  <p className="text-sm leading-relaxed opacity-80 whitespace-pre-line">{policies[activePolicy as keyof typeof policies].content}</p>
                </div>
              </div>
            </div>
          )}
          {/* 免责声明弹窗 */}
          {isDisclaimerOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/50">
              <div className={`w-full max-w-lg max-h-[80vh] rounded-[32px] p-8 border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#2d1b4e] border-purple-800/50 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
                <div className="flex items-center justify-between mb-6 shrink-0">
                  <button onClick={() => setIsDisclaimerOpen(false)} className="flex items-center space-x-2 text-sm font-bold">
                    <ChevronLeft size={20} />
                    <span>{lang === 'zh' ? '返回' : 'Back'}</span>
                  </button>
                </div>
                <h2 className="text-2xl font-black mb-4 shrink-0">{lang === 'zh' ? 'AI 生成内容免责声明' : 'AI Content Disclaimer'}</h2>
                <div className="overflow-y-auto pr-2 no-scrollbar">
                  <p className="text-sm leading-relaxed opacity-80 whitespace-pre-line">
                    {lang === 'zh' ? `
                    📄 Selindell AI 内容免责声明 (官方中文版)
                    最后更新：2026年3月
                    
                    1. AI 生成内容的性质
                    在 Selindell 平台（“服务”）上生成的所有设计、3D 模型、图像和文本均由人工智能算法根据用户提供的提示词创建。这些输出按“原样”和“可用”基础提供，用于创意和定制制造目的。
                    
                    2. 不保证准确性或唯一性
                    Selindell 不保证 AI 生成内容的准确性、可靠性或唯一性。由于机器学习的性质，相似的提示词可能会为不同用户产生相似的输出。对于生成内容与现有知识产权之间的任何相似之处，Selindell 概不负责。
                    
                    3. 用户责任与知识产权
                    用户对所提供的输入（提示词）承担全部责任。您声明并保证您的提示词不侵犯任何第三方的知识产权、商标或隐私权。Selindell 仅作为工具提供商，不对用户生成的创意意图主张所有权，但用户必须确保其对输出的使用符合其所在司法管辖区的当地法律（包括但不限于美国和阿联酋法律）。
                    
                    4. 禁止内容与安全过滤器
                    我们的平台采用先进的安全过滤器来阻止生成有害、成人或非法内容。任何试图绕过这些过滤器或将本服务用于深度伪造（Deepfake）创建、骚扰或非法活动的行为均被严格禁止，并可能导致账户终止并向相关当局报告。
                    
                    5. 责任限制
                    在法律允许的最大范围内，对于因使用 AI 生成内容而引起的任何直接、间接、偶然或后果性损害（包括但不限于版权纠纷或基于 AI 设计的实物商品的生产缺陷），Selindell 及其运营者概不负责。
                    ` : `
                    📄 Selindell AI Content Disclaimer (Official English Version)
                    Last Updated: March 2026
                    
                    1. Nature of AI-Generated Content
                    All designs, 3D models, images, and text generated on the Selindell platform (the "Service") are created by Artificial Intelligence algorithms based on user-provided prompts. These outputs are provided "as is" and "as available" for creative and custom-manufacturing purposes.
                    
                    2. No Guarantee of Accuracy or Uniqueness
                    Selindell does not guarantee the accuracy, reliability, or uniqueness of the AI-generated content. Due to the nature of machine learning, similar prompts may result in similar outputs for different users. Selindell shall not be held liable for any similarities between generated content and existing intellectual property.
                    
                    3. User Responsibility & Intellectual Property
                    Users are solely responsible for the input (Prompts) they provide. You represent and warrant that your prompts do not infringe upon any third-party intellectual property rights, trademarks, or privacy rights. Selindell acts as a tool provider and does not claim ownership over user-generated creative intent, but users must ensure their use of the output complies with local laws in their jurisdiction (including but not limited to U.S. and UAE laws).
                    
                    4. Prohibited Content & Safety Filters
                    Our platform employs advanced safety filters to block the generation of harmful, adult, or illegal content. Any attempt to bypass these filters or use the Service for Deepfake creation, harassment, or illegal activities is strictly prohibited and may result in account termination and reporting to relevant authorities.
                    
                    5. Limitation of Liability
                    To the maximum extent permitted by law, Selindell and its operators shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of AI-generated content, including but not limited to copyright disputes or production defects of physical goods based on AI designs.
                    `}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Tab Bar (Removed for mobile) */}
        {/* {[AppView.HOME, AppView.SQUARE, AppView.MESSAGES, AppView.ORDERS, AppView.PROFILE, AppView.RESULT].includes(currentView) && !isLoadingProfile && (
          <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-20 backdrop-blur-xl border-t flex items-center justify-around px-4 z-50 transition-colors duration-500 md:hidden ${theme === 'dark' ? 'bg-[#1a0b2e]/80 border-purple-900/30' : 'bg-white/80 border-gray-100'}`}>
            <button 
              onClick={() => setCurrentView(AppView.HOME)}
              className={`flex flex-col items-center space-y-1 transition-all active:scale-90 ${currentView === AppView.HOME ? 'text-purple-500' : theme === 'dark' ? 'text-purple-300/40' : 'text-slate-400'}`}
            >
              <HomeIcon size={24} strokeWidth={currentView === AppView.HOME ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' && currentView !== AppView.HOME ? 'text-purple-300/40' : ''}`}>{navT.home}</span>
            </button>
            <button 
              onClick={() => setCurrentView(AppView.SQUARE)}
              className={`flex flex-col items-center space-y-1 transition-all active:scale-90 ${currentView === AppView.SQUARE ? 'text-purple-500' : theme === 'dark' ? 'text-purple-300/40' : 'text-slate-400'}`}
            >
              <Compass size={24} strokeWidth={currentView === AppView.SQUARE ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' && currentView !== AppView.SQUARE ? 'text-purple-300/40' : ''}`}>{navT.square}</span>
            </button>
            <button 
              onClick={() => setCurrentView(AppView.MESSAGES)}
              className={`flex flex-col items-center space-y-1 transition-all active:scale-90 relative ${currentView === AppView.MESSAGES ? 'text-purple-500' : theme === 'dark' ? 'text-purple-300/40' : 'text-slate-400'}`}
            >
              <div className="relative">
                <MessageSquare size={24} strokeWidth={currentView === AppView.MESSAGES ? 2.5 : 2} />
                {unreadMessages > 0 && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a0b2e] shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                )}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' && currentView !== AppView.MESSAGES ? 'text-purple-300/40' : ''}`}>{navT.messages}</span>
            </button>
            <button 
              onClick={() => setCurrentView(AppView.ORDERS)}
              className={`flex flex-col items-center space-y-1 transition-all active:scale-90 ${currentView === AppView.ORDERS ? 'text-purple-500' : theme === 'dark' ? 'text-purple-300/40' : 'text-slate-400'}`}
            >
              <ShoppingBag size={24} strokeWidth={currentView === AppView.ORDERS ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' && currentView !== AppView.ORDERS ? 'text-purple-300/40' : ''}`}>{navT.orders}</span>
            </button>
            <button 
              onClick={() => setCurrentView(AppView.PROFILE)}
              className={`flex flex-col items-center space-y-1 transition-all active:scale-90 ${currentView === AppView.PROFILE ? 'text-purple-500' : theme === 'dark' ? 'text-purple-300/40' : 'text-slate-400'}`}
            >
              <User size={24} strokeWidth={currentView === AppView.PROFILE ? 2.5 : 2} />
              <span className={`text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' && currentView !== AppView.PROFILE ? 'text-purple-300/40' : ''}`}>{navT.profile}</span>
            </button>
          </nav>
        )} */}
      </div>
    </div>
  );
};

export default App;
