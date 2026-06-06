
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MapPin, CheckCircle2, ShieldCheck, Mail, Globe, Lock, Loader2, Sparkles } from 'lucide-react';
import { GeneratedCreation, Address, AppView } from '../types';
import { uploadImage, db } from '../lib/supabase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, onSnapshot } from '../lib/supabase';
import { auth, supabase } from '../lib/supabase';
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
    name: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    selectedAddressId: !isGuest ? (addresses.find(a => a.isDefault)?.id || addresses[0]?.id || '') : ''
  });

  const [guestForm, setGuestForm] = useState({
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
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSdkLoading, setIsSdkLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showPaymentConfirmBtn, setShowPaymentConfirmBtn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowPaymentConfirmBtn(true), 3000);
    return () => clearTimeout(timer);
  }, []);

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
        snap.forEach((d: any) => deleteDoc(d.ref));
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
          guestForm.phone.trim().length > 5 &&
          guestForm.name.trim().length > 0 &&
          guestForm.addressLine1.trim().length > 0
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
      if (!data.phone.trim()) return lang === 'zh' ? '请输入手机号' : 'Please enter your phone number';
      if (!data.name.trim()) return t.validateName;
      if (!data.addressLine1.trim()) return t.validateStreet;
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
        guest_phone: isGuest ? data.phone.trim() : null,
        contact_phone: isGuest ? data.phone.trim() : (addresses.find(a => a.id === data.selectedAddressId)?.phone || null),
        contact_name: isGuest ? data.name : (addresses.find(a => a.id === data.selectedAddressId)?.name || null),
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
          onClick={() => onPaymentComplete(creation.id, isGuest ? formRef.current.phone : undefined)}
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
                  <label className={`text-[9px] font-black uppercase tracking-widest px-1 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{t.addressLabel}</label>
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
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${theme === 'dark' ? 'text-blue-300 bg-blue-900/60' : 'text-blue-600 bg-blue-50'}`}>{lang === 'zh' ? '小型4cm规格' : 'Mini 4cm Size'}</span>
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
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold text-green-500 mb-1`}>{lang === 'zh' ? '最快8天到货' : 'Fastest delivery in 8 days'}</span>
                  <span className={`text-5xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>¥299</span>
                </div>
              </div>

              <div className="relative w-full mt-4 min-h-[60px] space-y-6 flex flex-col items-center border-t border-dashed border-gray-200/50 pt-8">
                 <h3 className={`text-lg font-black mb-2 tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                   {lang === 'zh' ? '请使用微信扫码付款' : 'Please scan to pay via WeChat'}
                 </h3>
                 <div className="w-64 h-64 bg-gray-100 rounded-3xl overflow-hidden relative border-4 border-[#07c160] shadow-lg shadow-[#07c160]/20">
                   <img 
                     src="/wxpay.png" 
                     alt="WeChat Pay QR Code" 
                     className="w-full h-full object-cover pointer-events-auto select-none"
                     style={{ WebkitTouchCallout: 'default' }}
                   />
                   <div className="absolute bottom-0 left-0 right-0 bg-[#07c160]/90 py-2 flex items-center justify-center space-x-2 text-white pointer-events-none">
                      <svg viewBox="0 0 1024 1024" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M512 0c282.752 0 512 229.248 512 512s-229.248 512-512 512S0 794.752 0 512 229.248 0 512 0zm-155.648 409.6a55.296 55.296 0 1 0 0-110.592 55.296 55.296 0 0 0 0 110.592zm311.296 0a55.296 55.296 0 1 0 0-110.592 55.296 55.296 0 0 0 0 110.592zM512 905.216c204.8 0 384-142.336 384-332.8S716.8 239.616 512 239.616 128 381.952 128 572.416 307.2 905.216 512 905.216zm-59.392-411.648a274.432 274.432 0 0 1 118.784 0 25.6 25.6 0 1 0-7.168-50.688 325.632 325.632 0 0 0-104.448 0 25.6 25.6 0 1 0-7.168 50.688z"/></svg>
                      <span className="text-xs font-bold tracking-widest">{lang === 'zh' ? '长按保存或识别二维码' : 'Long press to scan'}</span>
                   </div>
                 </div>

                 <div className="w-full mt-6">
                 {showPaymentConfirmBtn ? (
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
                          
                          let userEmail = '';
                          if (!isGuest) {
                            const { data: userData } = await auth.getUser();
                            userEmail = userData?.user?.email || '';
                          }

                          const imageUrls = await Promise.all(
                            creation.imageUrls.map(async (img) => {
                              try {
                                return await uploadImage(img, 'creations');
                              } catch (e: any) {
                                console.error("Image upload failed for one image:", e);
                                throw new Error("图片上传失败。Please check the network and try again.");
                              }
                            })
                          );

                          const orderPayload = {
                            user_id: userId,
                            guest_phone: isGuest ? data.phone.trim() : null,
                            contact_phone: isGuest ? data.phone.trim() : (addresses.find(a => a.id === data.selectedAddressId)?.phone || null),
                            contact_name: isGuest ? data.name : (addresses.find(a => a.id === data.selectedAddressId)?.name || null),
                            title: creation.title,
                            prompt: creation.prompt,
                            style: creation.style,
                            amount: 299,
                            status: 'paid_manual',
                            is_public: false,
                            story_card: creation.storyCard || null,
                            preview_images: imageUrls.length > 0 ? imageUrls : creation.imageUrls,
                            shipping_info: isGuest ? {
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
                          
                          setIsSuccess(true);
                          setTimeout(() => {
                            onPaymentComplete(creation.id, isGuest ? data.phone : userEmail);
                          }, 1500);

                        } catch (error: any) {
                          console.error("下单错误:", error);
                          setErrorMsg(lang === 'zh' ? '下单失败，请稍后重试' : 'Checkout failed, please try again later');
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className={`w-full py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all bg-[#07c160] text-white hover:bg-[#06ad56] shadow-lg shadow-[#07c160]/30 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? (
                        <div className="flex justify-center items-center space-x-2">
                           <Loader2 size={18} className="animate-spin" />
                           <span>{lang === 'zh' ? '处理中...' : 'Processing...'}</span>
                        </div>
                      ) : (
                        lang === 'zh' ? '我已付款进入下一步' : 'I have paid, continue'
                      )}
                    </button>
                 ) : (
                    <div className="w-full py-4 flex flex-col items-center justify-center space-y-2 text-gray-400 min-h-[56px] border-2 border-dashed border-gray-200 rounded-full bg-gray-50/50">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-xs font-bold tracking-widest">{lang === 'zh' ? '请扫码完成付款...' : 'Waiting for payment...'}</span>
                    </div>
                 )}
                 </div>
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



      </div>
    </div>
  );
};

export default Checkout;