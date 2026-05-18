
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, CheckCircle2, ShieldCheck, Mail, Globe, Lock, Loader2, Sparkles } from 'lucide-react';
import { GeneratedCreation, Address, AppView } from '../types';
import { uploadImage, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { aiService } from '../services/aiService';
import { translations, LanguageCode } from '../translations';

interface CheckoutProps {
  lang: LanguageCode;
  userId: string | null;
  creation: GeneratedCreation;
  addresses: Address[];
  onPaymentComplete: (creationId: string, guestEmail?: string) => void;
  onBack: () => void;
  theme: 'light' | 'dark';
  onLoginRequest?: () => void;
}



const Checkout: React.FC<CheckoutProps> = ({ lang, userId, creation, addresses, onPaymentComplete, onBack, theme, onLoginRequest }) => {
  const t = translations[lang as LanguageCode].checkout as any;
  const addrT = translations[lang as LanguageCode].address;
  const isGuest = !userId;
  
  const formRef = useRef({
    email: '',
    name: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    selectedAddressId: !isGuest ? (addresses.find(a => a.isDefault)?.id || addresses[0]?.id || '') : ''
  });

  const [guestForm, setGuestForm] = useState({
    email: '',
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    !isGuest ? (addresses.find(a => a.isDefault)?.id || addresses[0]?.id || '') : ''
  );
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [guestEmailForOrder, setGuestEmailForOrder] = useState<string>('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSdkLoading, setIsSdkLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  useEffect(() => {
    if (userId && creation) {
      const checkFavorite = async () => {
        const snap = await getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId), where('design_id', '==', creation.id)));
        setIsFavorited(!snap.empty);
      };
      checkFavorite();
    }
  }, [userId, creation]);

  const handleFavorite = async () => {
    if (!userId) {
      if (onLoginRequest) onLoginRequest();
      return;
    }
    if (!creation || isFavoriting) return;

    setIsFavoriting(true);
    try {
      if (isFavorited) {
        const snap = await getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId), where('design_id', '==', creation.id)));
        snap.forEach(d => deleteDoc(d.ref));
        setIsFavorited(false);
      } else {
        // Ensure work is saved
        try {
          await setDoc(doc(db, 'works', creation.id), {
            id: creation.id,
            user_id: userId,
            title: creation.title,
            image_url: creation.imageUrl,
            image_urls: creation.imageUrls || [],
            video_url: creation.videoUrl || null,
            style: creation.style,
            prompt: creation.prompt,
            stats: creation.stats || null,
            story_card: (creation as any).storyCard || null,
            created_at: new Date().toISOString()
          }, { merge: true });
        } catch (workError) {
          console.error("Error saving to works:", workError);
          throw workError;
        }

        await addDoc(collection(db, 'favorites'), { 
          user_id: userId, 
          design_id: creation.id 
        });
        
        setIsFavorited(true);
        setShowSaveToast(true);
        setTimeout(() => setShowSaveToast(false), 3000);
      }
    } catch (err) {
      console.error("Favorite error:", err);
    } finally {
      setIsFavoriting(false);
    }
  };

  useEffect(() => {
    formRef.current = {
      ...guestForm,
      selectedAddressId
    };
    
    // Validate form for button activation
    const validate = () => {
      if (isGuest) {
        return (
          guestForm.email.includes('@') &&
          guestForm.name.trim().length > 0 &&
          guestForm.addressLine1.trim().length > 0 &&
          guestForm.city.trim().length > 0 &&
          guestForm.zipCode.trim().length > 0
        );
      } else {
        return selectedAddressId !== '';
      }
    };
    setIsFormValid(validate());
  }, [guestForm, selectedAddressId, isGuest]);

  const validateForm = () => {
    const data = formRef.current;
    if (isGuest) {
      if (!data.email.includes('@')) return t.validateEmail;
      if (!data.name.trim()) return t.validateName;
      if (!data.addressLine1.trim()) return t.validateStreet;
      if (!data.city.trim()) return t.validateCity;
      if (!data.zipCode.trim()) return t.validateZip;
    } else if (!data.selectedAddressId) {
      return t.validateAddress;
    }
    return null;
  };





  const handlePaymentSuccess = async (details: any) => {
    try {
      setIsProcessing(true);
      const data = formRef.current;

      // Sanitizer helper for Firestore
      const sanitize = (obj: any) => {
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
          newObj[key] = obj[key] === undefined ? null : obj[key];
        });
        return newObj;
      };

      // 1. 将 Base64 图片上传到 Supabase Storage
      const imageUrls = await Promise.all(
        creation.imageUrls.map(async (img) => {
          try {
            return await uploadImage(img, 'creations');
          } catch (e) {
            console.error("Image upload failed for one image:", e);
            return img; // 兜底返回原始数据
          }
        })
      );

      // 2. 准备订单数据，使用上传后的 URL
      const orderPayload = sanitize({
        user_id: userId,
        guest_email: isGuest ? data.email.trim() : null,
        title: creation.title,
        prompt: creation.prompt,
        style: creation.style,
        amount: 129,
        status: 'paid',
        is_public: false,
        story_card: creation.storyCard,
        preview_images: imageUrls, 
        payment_id: details.id,
        shipping_info: isGuest ? {
          email: data.email,
          name: data.name,
          phone: data.phone,
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country
        } : {
          address_id: data.selectedAddressId
        }
      });

      const docRef = await addDoc(collection(db, 'orders'), orderPayload);

      if (docRef.id) {
        setOrderId(docRef.id);
      }

      setIsSuccess(true);
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Save Order Error:', error);
      setErrorMsg(`${lang === 'zh' ? '支付成功但订单保存失败' : 'Payment success but order save failed'}: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleShareToSquare = async () => {
    if (!orderId || isShared) return;
    
    setIsProcessing(true);
    try {
      await setDoc(doc(db, 'orders', orderId), { is_public: true }, { merge: true });
      setIsShared(true);
    } catch (err) {
      console.error('Share error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
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
          {lang === 'zh' ? '铸造成功！' : 'FORGED SUCCESSFULLY!'}
        </h2>
        
        <div className="max-w-sm mx-auto space-y-4 mb-12">
          <p className={`font-medium leading-relaxed ${theme === 'dark' ? 'text-purple-200/60' : 'text-gray-500'}`}>
            {t.successSub}
          </p>
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30' : 'bg-gray-50 border-gray-100'}`}>
            <ShieldCheck size={14} className="text-green-500" />
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>
              {lang === 'zh' ? '订单已存入馆藏档案' : 'ORDER ARCHIVED IN COLLECTION'}
            </span>
          </div>
        </div>

        {/* Share to Square Option */}
        <div className={`w-full max-w-md rounded-[32px] p-8 border shadow-xl mb-12 animate-in slide-in-from-bottom-8 duration-1000 delay-300 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 shadow-purple-950/50' : 'bg-white border-gray-100 shadow-gray-100/50'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="text-left">
              <h3 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.shareTitle}</h3>
              <p className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.shareSub}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Sparkles size={24} />
            </div>
          </div>
          
          <button
            onClick={handleShareToSquare}
            disabled={isShared || isProcessing}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
              isShared 
                ? (theme === 'dark' ? 'bg-green-900/20 text-green-400 border border-green-800/30' : 'bg-green-50 text-green-600 border border-green-100')
                : (theme === 'dark' ? 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95 shadow-lg shadow-purple-900/50' : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95 shadow-lg shadow-gray-200')
            }`}
          >
            {isProcessing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isShared ? (
              <>
                <CheckCircle2 size={18} />
                <span>{t.sharedSuccess}</span>
              </>
            ) : (
              <>
                <Globe size={18} />
                <span>{t.shareBtn}</span>
              </>
            )}
          </button>
        </div>

        <button 
          onClick={() => onPaymentComplete(creation.id, isGuest ? formRef.current.email : undefined)}
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
  }

  return (
    <div className={`py-8 pb-32 animate-in fade-in duration-500 max-w-5xl mx-auto transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : ''}`}>
      {/* Toast Notification */}
      {showSaveToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`flex items-center space-x-2 px-6 py-3 rounded-full shadow-2xl border ${
            theme === 'dark' 
              ? 'bg-purple-900/90 border-purple-500/30 text-white backdrop-blur-md' 
              : 'bg-white/90 border-purple-100 text-gray-800 backdrop-blur-md'
          }`}>
            <Sparkles className="text-pink-500" size={18} />
            <span className="text-sm font-bold">{t.saveSuccess || '✨ 收藏成功！已为您保存在「我的收藏」中，随时可找回并下单。'}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-10 px-2">
        <button onClick={onBack} className={`p-3 rounded-full border shadow-sm active:scale-90 transition-transform ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50' : 'bg-white border-gray-100'}`}>
          <ChevronLeft size={24} className={theme === 'dark' ? 'text-purple-300' : 'text-gray-400'} />
        </button>
        <div className="text-center">
          <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.summary}</p>
        </div>
        <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-100'}`}>
           <Lock size={12} className="text-green-600" />
           <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">{t.encrypted}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-8 p-5 bg-red-50 rounded-[24px] border border-red-100 text-red-600 text-sm font-bold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs">!</span>
            </div>
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white border border-red-200 rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-colors"
          >
            {lang === 'zh' ? '点击重试' : 'Retry'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        <div className="lg:col-span-3 space-y-8">
          <div className={`rounded-[40px] p-8 border shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center space-x-3 mb-8">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                <MapPin size={18} />
              </div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.destination}</h3>
            </div>
            
            {isGuest ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.emailLabel}</label>
                  <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 focus-within:bg-purple-900/60 focus-within:border-purple-500' : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-purple-200'}`}>
                    <Mail size={18} className="text-gray-300 mr-3" />
                    <input 
                      type="email" 
                      placeholder="email@example.com"
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-400/30' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={guestForm.email}
                      onChange={(e) => setGuestForm({...guestForm, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.nameLabel}</label>
                    <div className={`rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 focus-within:bg-purple-900/60 focus-within:border-purple-500' : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-purple-200'}`}>
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-400/30' : 'text-gray-900 placeholder:text-gray-300'}`}
                        value={guestForm.name}
                        onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.phoneLabel}</label>
                    <div className={`rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 focus-within:bg-purple-900/60 focus-within:border-purple-500' : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-purple-200'}`}>
                      <input 
                        type="tel" 
                        placeholder="+1 (555) 000-0000"
                        className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-400/30' : 'text-gray-900 placeholder:text-gray-300'}`}
                        value={guestForm.phone}
                        onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.addressLabel} (Line 1)</label>
                  <div className={`rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 focus-within:bg-purple-900/60 focus-within:border-purple-500' : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-purple-200'}`}>
                    <input 
                      type="text" 
                      placeholder={addrT.houseNum}
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-400/30' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={guestForm.addressLine1}
                      onChange={(e) => setGuestForm({...guestForm, addressLine1: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.addressLabel} (Line 2 - Optional)</label>
                  <div className={`rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 focus-within:bg-purple-900/60 focus-within:border-purple-500' : 'bg-gray-50 border-gray-100 focus-within:bg-white focus-within:border-purple-200'}`}>
                    <input 
                      type="text" 
                      placeholder="Apartment, suite, unit, etc."
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ${theme === 'dark' ? 'text-white placeholder:text-purple-400/30' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={guestForm.addressLine2}
                      onChange={(e) => setGuestForm({...guestForm, addressLine2: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.cityLabel}</label>
                    <input 
                      placeholder="New York"
                      className={`rounded-2xl p-4 border text-sm font-bold w-full focus:ring-0 transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 text-white placeholder:text-purple-400/30 focus:bg-purple-900/60 focus:border-purple-500' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-purple-200'}`}
                      value={guestForm.city}
                      onChange={(e) => setGuestForm({...guestForm, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.stateLabel}</label>
                    <input 
                      placeholder="NY"
                      className={`rounded-2xl p-4 border text-sm font-bold w-full focus:ring-0 transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 text-white placeholder:text-purple-400/30 focus:bg-purple-900/60 focus:border-purple-500' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-purple-200'}`}
                      value={guestForm.state}
                      onChange={(e) => setGuestForm({...guestForm, state: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.zipLabel}</label>
                    <input 
                      placeholder="10001"
                      className={`rounded-2xl p-4 border text-sm font-bold w-full focus:ring-0 transition-all ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 text-white placeholder:text-purple-400/30 focus:bg-purple-900/60 focus:border-purple-500' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-purple-200'}`}
                      value={guestForm.zipCode}
                      onChange={(e) => setGuestForm({...guestForm, zipCode: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            ) : (
              addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map(addr => (
                    <div 
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-6 rounded-[28px] border-2 cursor-pointer transition-all relative overflow-hidden ${
                        selectedAddressId === addr.id 
                          ? (theme === 'dark' ? 'border-purple-500 bg-purple-900/40' : 'border-purple-500 bg-purple-50')
                          : (theme === 'dark' ? 'border-purple-800/30 bg-purple-900/10 hover:border-purple-700/50' : 'border-gray-50 hover:border-gray-200')
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{addr.name}</span>
                        {selectedAddressId === addr.id && <CheckCircle2 className="text-purple-600" size={18} />}
                      </div>
                      <p className={`text-[11px] font-mono mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{addr.phone}</p>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-500'}`}>{addr.location}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 border-2 border-dashed rounded-[32px] ${theme === 'dark' ? 'border-purple-800/30 bg-purple-900/10' : 'border-gray-100 bg-gray-50/50'}`}>
                   <p className={`text-sm font-medium ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{lang === 'zh' ? '请先在个人中心添加收货地址。' : 'Please go to Profile to add a shipping address.'}</p>
                </div>
              )
            )}
          </div>

          <div className={`rounded-[40px] p-6 border shadow-sm flex items-center space-x-6 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <div className={`w-28 h-28 rounded-3xl overflow-hidden shadow-inner shrink-0 ${theme === 'dark' ? 'bg-purple-950' : 'bg-gray-50'}`}>
               <img src={creation.imageUrl} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${theme === 'dark' ? 'text-purple-300 bg-purple-900/60' : 'text-purple-600 bg-purple-50'}`}>{creation.style}</span>
              </div>
              <h4 className={`text-xl font-black truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{creation.title}</h4>
              <p className={`text-xs mt-2 font-medium leading-relaxed line-clamp-2 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>Prompt: "{creation.prompt}"</p>
            </div>
          </div>

          {/* Story Card Section */}
          <div className={`rounded-[40px] p-8 border shadow-sm relative overflow-hidden group ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles size={80} className="text-purple-500" />
            </div>
            <div className="flex items-center space-x-3 mb-6">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                <Sparkles size={18} />
              </div>
              <h3 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lang === 'zh' ? 'IP 故事卡' : 'IP STORY CARD'}</h3>
            </div>
            
            <div className="relative">
                <p className={`text-base font-medium leading-relaxed italic ${theme === 'dark' ? 'text-purple-100' : 'text-gray-700'}`}>
                  “{creation.storyCard}”
                </p>
                <div className="mt-6 flex items-center space-x-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-purple-500' : 'text-gray-300'}`}>
                    SELINDELL IP ARCHIVE
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
                </div>
              </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className={`rounded-[40px] p-8 border shadow-sm sticky top-24 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <h3 className={`text-[10px] font-black uppercase tracking-widest mb-10 italic ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.summaryTitle}</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className={`font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.unitPrice}</span>
                <span className={`font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>¥299.00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className={`font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.shipping}</span>
                <span className="text-green-500 font-black tracking-widest uppercase italic">{t.free}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className={`font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.shippingInfo}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className={`font-bold uppercase tracking-tighter ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.deliveryInfo}</span>
              </div>
              <div className={`h-[1px] my-6 ${theme === 'dark' ? 'bg-purple-800/30' : 'bg-gray-50'}`}></div>
              <div className="flex justify-between items-end mb-10">
                <span className={`font-black text-xs uppercase tracking-widest mb-1.5 ${theme === 'dark' ? 'text-purple-500' : 'text-gray-400'}`}>{t.total}</span>
                <span className={`text-5xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>¥299</span>
              </div>

              <div className="relative w-full mt-4 min-h-[60px] space-y-6">
                {/* 支付按钮 */}
                <button
                  onClick={async () => {
                    if (!isFormValid) {
                      const error = validateForm();
                      if (error) setErrorMsg(error);
                      return;
                    }
                    setIsProcessing(true);
                    try {
                      const data = formRef.current;
                      
                      // 获取用户邮箱用于 Whop 结账和 Webhook 匹配
                      let userEmail = data.email;
                      if (!isGuest) {
                        userEmail = auth.currentUser?.email || '';
                      }

                      // 1. 将 Base64 图片上传到 Supabase Storage
                      const imageUrls = await Promise.all(
                        creation.imageUrls.map(async (img) => {
                          try {
                            return await uploadImage(img, 'creations');
                          } catch (e) {
                            console.error("Image upload failed for one image:", e);
                            return img;
                          }
                        })
                      );

                      // 2. 保存订单到 Supabase，状态为 pending
                      const orderPayload = {
                        user_id: userId,
                        guest_email: userEmail,
                        title: creation.title,
                        prompt: creation.prompt,
                        style: creation.style,
                        amount: 299,
                        status: 'pending',
                        is_public: false,
                        story_card: creation.storyCard || null,
                        preview_images: imageUrls,
                        shipping_info: isGuest ? {
                          email: data.email,
                          name: data.name,
                          phone: data.phone,
                          addressLine1: data.addressLine1,
                          city: data.city,
                          state: data.state,
                          zipCode: data.zipCode,
                          country: data.country
                        } : {
                          address_id: data.selectedAddressId
                        }
                      };

                      const docRef = await addDoc(collection(db, 'orders'), orderPayload);
                      setOrderId(docRef.id);
                      setGuestEmailForOrder(userEmail);

                      // 3. 调用真实支付接口
                      const response = await fetch("/api/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: userEmail, amount: 299, orderId: docRef.id }),
                      });
                      
                      const result = await response.json();
                      if (!response.ok) {
                        throw new Error(result.error || "Failed to create payment url");
                      }
                      
                      // 跳转到爱发电支付页面
                      window.location.href = result.payUrl;

                    } catch (error: any) {
                      console.error("下单错误:", error);
                      setErrorMsg(lang === 'zh' ? '下单失败，请稍后重试' : 'Checkout failed, please try again later');
                      setIsProcessing(false);
                    }
                  }}
                  className={`w-full py-4 mt-4 rounded-full font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                    isProcessing ? 'opacity-50 cursor-not-allowed ' : ''
                  }${
                    theme === 'dark' 
                      ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/50' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200'
                  }`}
                  disabled={isProcessing}
                >
                  <Globe size={18} />
                  <span>{lang === 'zh' ? '去付款 (支持微信/支付宝)' : 'Checkout'}</span>
                </button>

                {/* 处理中遮罩 (Processing Overlay) */}
                {isProcessing && (
                  <div className={`absolute inset-0 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-purple-900/90' : 'bg-white/90'}`}>
                    <Loader2 size={28} className="animate-spin text-blue-500 mb-4" />
                    <span className={`text-sm font-black uppercase tracking-widest text-center px-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {lang === 'zh' ? '正在生成订单...' : 'Creating order...'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Save for later section */}
              <div className={`mt-6 pt-6 border-t flex flex-col items-center justify-center space-y-3 ${theme === 'dark' ? 'border-purple-800/30' : 'border-gray-100'}`}>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  💔 {t.saveForLater || '现在不想买？先存着。'}
                </p>
                <button
                  onClick={handleFavorite}
                  disabled={isFavoriting}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                    isFavorited 
                      ? 'bg-pink-500/10 text-pink-500 border border-pink-500/30' 
                      : theme === 'dark' 
                        ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50 hover:bg-purple-800/60' 
                        : 'bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100'
                  }`}
                >
                  {isFavoriting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span className={isFavorited ? 'text-pink-500' : ''}>{isFavorited ? '❤️' : '🤍'}</span>
                  )}
                  <span>{isFavorited ? (t.savedBtn || '已收藏') : (t.saveBtn || '加入收藏')}</span>
                </button>
              </div>

              <div className="mt-8 flex flex-col items-center text-center">
                 <div className={`flex items-center space-x-2 mb-4 px-4 py-2 rounded-full border ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/30 text-purple-400' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    <ShieldCheck size={14} className="text-green-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{t.protection}</span>
                 </div>
                 <p className={`text-[10px] leading-relaxed font-medium ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.secureHint}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 支付方式弹窗 (Payment Modal) */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSimulatingPayment && setShowPaymentModal(false)}></div>
            <div className={`relative w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#1a0b2e] border-purple-800' : 'bg-white border-gray-100'} border`}>
              <h3 className={`text-2xl font-black mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                收银台
              </h3>
              
              <div className="space-y-4 mb-8">
                <button 
                  onClick={() => setPaymentMethod('wechat')}
                  className={`w-full flex items-center space-x-4 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'wechat' 
                      ? (theme === 'dark' ? 'border-[#07C160] bg-[#07C160]/10' : 'border-[#07C160] bg-[#07C160]/5') 
                      : (theme === 'dark' ? 'border-purple-800/30 hover:border-purple-600/50' : 'border-gray-100 hover:border-gray-300')
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#07C160] flex items-center justify-center">
                    <Sparkles className="text-white" size={20} />
                  </div>
                  <span className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>微信支付</span>
                </button>

                <button 
                  onClick={() => setPaymentMethod('alipay')}
                  className={`w-full flex items-center space-x-4 p-4 rounded-2xl border-2 transition-all ${
                    paymentMethod === 'alipay' 
                      ? (theme === 'dark' ? 'border-[#1677FF] bg-[#1677FF]/10' : 'border-[#1677FF] bg-[#1677FF]/5') 
                      : (theme === 'dark' ? 'border-purple-800/30 hover:border-purple-600/50' : 'border-gray-100 hover:border-gray-300')
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#1677FF] flex items-center justify-center">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <span className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>支付宝支付</span>
                </button>
              </div>

              <button
                onClick={async () => {
                  if (!orderId) return;
                  setIsSimulatingPayment(true);
                  try {
                    // Simulate processing
                    await new Promise(r => setTimeout(r, 1500));
                    await updateDoc(doc(db, 'orders', orderId), { status: 'paid' });
                    setShowPaymentModal(false);
                    setIsSuccess(true);
                    setTimeout(() => {
                      onPaymentComplete(creation.id, guestEmailForOrder);
                    }, 3000);
                  } catch (e) {
                    console.error('Payment simulation error:', e);
                  } finally {
                    setIsSimulatingPayment(false);
                  }
                }}
                disabled={isSimulatingPayment}
                className={`w-full py-4 rounded-full font-black text-lg transition-all flex items-center justify-center space-x-2 ${
                  isSimulatingPayment ? 'opacity-50 cursor-not-allowed ' : ''
                }${
                  paymentMethod === 'wechat' ? 'bg-[#07C160] hover:bg-[#06ad56] text-white shadow-[#07C160]/50' : 'bg-[#1677FF] hover:bg-[#156ce5] text-white shadow-[#1677FF]/50'
                } shadow-lg`}
              >
                {isSimulatingPayment ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <span>确认支付 ¥299</span>
                )}
              </button>
              
              {!isSimulatingPayment && (
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className={`w-full mt-4 py-3 rounded-full font-bold text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white bg-white/5' : 'text-gray-500 hover:text-gray-900 bg-black/5'}`}
                >
                  取消
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Checkout;