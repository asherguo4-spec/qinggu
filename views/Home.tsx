
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, AlertTriangle, Wand2, Loader2, ShoppingBag, Clock, Info, Check, ChevronLeft, Send, Zap, Package, ArrowUp, ChevronUp, Globe, Heart, ImagePlus } from 'lucide-react';
import { CREATION_STYLES } from '../constants';
import { AppView, GeneratedCreation } from '../types';
import LoadingAnimation from '../components/LoadingAnimation';
import { geminiService } from '../services/aiService'; 
import ActionFigure3DViewer from '../components/ActionFigure3DViewer';
import StatsCard from '../components/StatsCard';
import { db } from '../lib/supabase';
import { collection, query, where, orderBy, getDocs, limit, doc, setDoc, deleteDoc, addDoc, documentId } from '../lib/supabase';
import { translations, LanguageCode } from '../translations';

interface HomeProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  onCreationSuccess: (creation: GeneratedCreation) => void;
  setPendingOrder: (creation: GeneratedCreation) => void;
  userId?: string | null;
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  theme: 'light' | 'dark';
}

interface SquareItem extends GeneratedCreation {
  creatorName?: string;
  creatorAvatar?: string;
  likeCount?: number;
  user_id?: string;
}

const Home: React.FC<HomeProps> = ({ currentView, setView, onCreationSuccess, setPendingOrder, userId, lang, setLang, theme }) => {
  const t = translations[lang].home;
  
  const [prompt, setPrompt] = useState('');
  const [selectedStyleId, setSelectedStyleId] = useState(CREATION_STYLES[0].id);
  const [lastResult, setLastResult] = useState<GeneratedCreation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyrightSuggestion, setCopyrightSuggestion] = useState<string | null>(null);
  const [showSlowNetworkHint, setShowSlowNetworkHint] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [autoStyleHint, setAutoStyleHint] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(lang === 'zh' ? '图片大小不能超过5MB' : 'Image size cannot exceed 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImage(reader.result as string);
        setSelectedStyleId('cute');
        setAutoStyleHint(lang === 'zh' ? '已自动为你匹配萌趣Q版' : 'Automatically matched Cute style for you');
        setTimeout(() => setAutoStyleHint(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const [squareItems, setSquareItems] = useState<SquareItem[]>([]);
  const [isSquareLoading, setIsSquareLoading] = useState(true);
  const [selectedSquareItem, setSelectedSquareItem] = useState<SquareItem | null>(null);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (userId) {
      const fetchLikes = async () => {
        const snap = await getDocs(query(collection(db, 'likes'), where('user_id', '==', userId)));
        if (!snap.empty) setLikedItems(new Set(snap.docs.map((d: any) => d.data().design_id)));
      };
      fetchLikes();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && lastResult) {
      const checkFavorite = async () => {
        const snap = await getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId), where('design_id', '==', lastResult.id)));
        setIsFavorited(!snap.empty);
      };
      checkFavorite();
    }
  }, [userId, lastResult]);

  const toggleFavorite = async () => {
    if (!userId) {
      alert(lang === 'zh' ? '请先登录' : 'Please login first');
      return;
    }
    if (!lastResult) return;

    if (isFavorited) {
      const snap = await getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId), where('design_id', '==', lastResult.id)));
      snap.forEach((d: any) => deleteDoc(d.ref));
      setIsFavorited(false);
    } else {
      // 1. First ensure the work is saved in the 'works' table so it can be retrieved later
      try {
        await setDoc(doc(db, 'works', lastResult.id), {
          id: lastResult.id,
          user_id: userId,
          title: lastResult.title || null,
          image_url: lastResult.imageUrl || null,
          image_urls: lastResult.imageUrls || [],
          style: lastResult.style || null,
          prompt: lastResult.prompt || null,
          lore: lastResult.lore || null,
          stats: lastResult.stats || null,
          story_card: lastResult.storyCard || null,
          created_at: new Date().toISOString()
        }, { merge: true });
        
        // 2. Add to favorites table
        await addDoc(collection(db, 'favorites'), { 
          user_id: userId, 
          design_id: lastResult.id 
        });
        
        setIsFavorited(true);
      } catch (err) {
        console.error("Favorite error:", err);
        alert(lang === 'zh' ? '收藏失败' : 'Favorite failed');
      }
    }
  };

  const handleLike = async (item: SquareItem) => {
    if (!userId) {
      alert(lang === 'zh' ? '请先登录' : 'Please login first');
      return;
    }

    const isLiked = likedItems.has(item.id);
    
    if (isLiked) {
      // 取消点赞
      const snap = await getDocs(query(collection(db, 'likes'), where('user_id', '==', userId), where('design_id', '==', item.id)));
      snap.forEach((d: any) => deleteDoc(d.ref));
      setLikedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      // 更新本地计数
      setSquareItems(prev => prev.map(i => i.id === item.id ? {...i, likeCount: (i.likeCount || 1) - 1} : i));
    } else {
      // 点赞
      await addDoc(collection(db, 'likes'), { user_id: userId, design_id: item.id });
      setLikedItems(prev => new Set(prev).add(item.id));
      // 更新本地计数
      setSquareItems(prev => prev.map(i => i.id === item.id ? {...i, likeCount: (i.likeCount || 0) + 1} : i));
      
      // 发送通知 (如果作品有作者ID)
      if (item.user_id && item.user_id !== userId) {
        await addDoc(collection(db, 'notifications'), {
          target_user_id: item.user_id,
          title: lang === 'zh' ? '收到新点赞' : 'New Like',
          content: lang === 'zh' ? `有人点赞了你的作品: ${item.title}` : `Someone liked your work: ${item.title}`,
          is_active: true,
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }
  };

  const inputSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      if (mainElement.scrollTop > 600) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let timer: any;
    if (isGenerating) {
      timer = setTimeout(() => setShowSlowNetworkHint(true), 8000);
    } else {
      setShowSlowNetworkHint(false);
    }
    return () => clearTimeout(timer);
  }, [isGenerating]);

  useEffect(() => {
    const fetchSquareData = async () => {
      setIsSquareLoading(true);
      try {
        // 查询 orders 表中已公开的作品
        const { docs: ordersDocs } = await getDocs(query(collection(db, 'orders'), where('status', '!=', 'pending'), where('is_public', '==', true), orderBy('status'), orderBy('created_at', 'desc'), limit(20)));
        const ordersData = ordersDocs.map((d: any) => ({id: d.id, ...d.data()}) as any);

        // 提取所有不重复的 user_id
        const userIds = Array.from(new Set((ordersData || []).map((w: any) => w.user_id).filter(Boolean)));

        // 查询这些 user_id 对应的用户信息
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          // Chunk for firestore 'in' limits and format promises
          const userPromises = [];
          for (let i = 0; i < userIds.length; i+=10) {
            const chunk = userIds.slice(i, i+10);
            userPromises.push(getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk))));
          }
          const userResults = await Promise.all(userPromises);
          userResults.forEach(result => {
             result.docs.forEach((u: any) => {
                usersMap[u.id] = u.data();
             });
          });
        }

        // 将数据拼装起来
        const mapped: SquareItem[] = (ordersData || []).map((item: any) => {
          const user = usersMap[item.user_id];
          return {
            id: item.id,
            user_id: item.user_id,
            title: item.title || (item.prompt ? item.prompt.slice(0, 15) : '未知造物'),
            imageUrl: item.preview_images?.[0] || 'https://picsum.photos/seed/placeholder/400/400',
            imageUrls: item.preview_images || [],
            style: item.style || 'Custom',
            prompt: item.prompt || '',
            timestamp: new Date(item.created_at || Date.now()).getTime(),
            status: 'paid', // 兼容旧逻辑
            isForSale: item.is_for_sale,
            salePrice: item.sale_price,
            creatorName: user?.nickname || `Creator_${item.id.slice(0, 4)}`,
            creatorAvatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`,
            storyCard: item.story_card,
            stats: {
               power: Math.floor(Math.random() * 40) + 60,
               agility: Math.floor(Math.random() * 40) + 60,
               soul: Math.floor(Math.random() * 40) + 60,
               rarity: ['SSR', 'SR', 'R'][Math.floor(Math.random() * 3)]
            }
          };
        });
        
        setSquareItems(mapped);
      } catch (e) {
        console.error("Square fetch error:", e);
        setSquareItems([]);
      } finally {
        setIsSquareLoading(false);
      }
    };
    fetchSquareData();
  }, [lang]);

  const handleGenerateClick = async () => {
    if (!prompt.trim() && !referenceImage) {
      setErrorMessage(t.placeholder);
      return;
    }
    if (isGenerating) return;

    const style = CREATION_STYLES.find(s => s.id === selectedStyleId) || CREATION_STYLES[0];
    setIsGenerating(true);
    setView(AppView.GENERATING);
    setErrorMessage(null);
    setCopyrightSuggestion(null);
    
    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      // 1. Copyright Check
      const copyrightCheck = await geminiService.checkCopyright(prompt, lang, signal);
      if (copyrightCheck.status === 'reject') {
        setIsGenerating(false);
        setView(AppView.HOME);
        setCopyrightSuggestion(copyrightCheck.suggestion || copyrightCheck.reason || "Copyright issue detected.");
        return;
      }

      // Parallelize image generation and lore generation to save time
      const [imageUrls, loreData, storyCard, shortTitle] = await Promise.all([
        geminiService.generate360Creation(prompt, style.id, referenceImage || undefined, signal),
        geminiService.generateLoreAndStats(prompt, signal),
        geminiService.generateStoryCard(prompt, style.name, lang, signal),
        geminiService.generateShortTitle(prompt, referenceImage || undefined, signal, lang)
      ]);

      if (signal.aborted) return;

      const newCreation: GeneratedCreation = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        title: shortTitle,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls,
        style: style.name,
        prompt: prompt,
        timestamp: Date.now(),
        status: 'pending',
        lore: loreData.lore,
        stats: loreData.stats,
        storyCard: storyCard
      };
      setLastResult(newCreation);
      onCreationSuccess(newCreation);
      setView(AppView.RESULT);
    } catch (error: any) {
      if (error.name === 'AbortError' || (error.message && error.message.toLowerCase().includes('abort'))) {
        console.log("Generation cancelled by user");
        return;
      }
      console.error("Generation error:", error);
      const errorDetail = error.message || "";
      let msg = lang === 'zh' ? "引擎忙碌，请稍后再试。" : lang === 'ja' ? "エンジンが混み合っています。後でもう一度お試しください。" : "Engine busy, please try again later.";
      
      if (errorDetail.includes("429")) {
        msg = lang === 'zh' ? "生成太频繁了，请等一分钟再试。" : lang === 'ja' ? "生成が頻繁すぎます。1分待ってからお試しください。" : "Too many requests, please wait a minute.";
      } else if (errorDetail.includes("402") || errorDetail.includes("balance") || errorDetail.includes("credit")) {
        msg = lang === 'zh' ? "OpenRouter 余额不足，请充值后重试。" : lang === 'ja' ? "OpenRouter の残高が不足しています。チャージしてからお試しください。" : "Insufficient OpenRouter balance, please recharge.";
      } else if (errorDetail.includes("fetch") || errorDetail.includes("Network")) {
        msg = lang === 'zh' ? "网络连接失败，请检查您的 VPN 是否开启。" : lang === 'ja' ? "ネットワーク接続に失敗しました。VPNが有効か確認してください。" : "Network error, please check your VPN.";
      } else if (errorDetail.includes("API_KEY") || errorDetail.includes("401")) {
        msg = lang === 'zh' ? "API 密钥无效或配置错误，请检查环境变量。" : lang === 'ja' ? "APIキーが無効または設定エラーです。環境変数を確認してください。" : "Invalid API Key, please check config.";
      } else {
        // Show the actual error from OpenRouter if it's something else
        msg = lang === 'zh' ? `生成失败: ${errorDetail}` : lang === 'ja' ? `生成に失敗しました: ${errorDetail}` : `Generation failed: ${errorDetail}`;
      }
      
      setErrorMessage(msg);
      setView(AppView.HOME);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setView(AppView.HOME);
  };

  const scrollToInput = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      mainElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isSquareOnly = currentView === AppView.SQUARE;

  if (currentView === AppView.GENERATING) return (
    <div className="h-full flex flex-col items-center justify-center relative">
      <div className="absolute top-4 left-4 z-50">
        <button onClick={handleCancelGeneration} className="p-3 bg-white/60 backdrop-blur-md rounded-full border border-gray-100 active:scale-90 transition-transform flex items-center justify-center shadow-sm">
          <ChevronLeft size={24} className="text-gray-400" />
        </button>
      </div>
      <LoadingAnimation showHint={showSlowNetworkHint} theme={theme} lang={lang} />
    </div>
  );

  return (
    <div className={`py-4 pb-32 relative ${isSquareOnly ? 'pt-8' : ''}`}>
      {autoStyleHint && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#FFB800] text-gray-900 border border-[#CC9300] font-bold text-sm px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(255,184,0,0.4)] flex items-center space-x-2">
            <Sparkles size={16} className="text-gray-900" />
            <span>{autoStyleHint}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`absolute inset-0 backdrop-blur-md ${theme === 'dark' ? 'bg-[#1a0b2e]/60' : 'bg-white/60'}`} onClick={() => setErrorMessage(null)}></div>
          <div className={`relative w-full max-sm rounded-[32px] p-8 border text-center animate-in zoom-in-95 shadow-2xl ${theme === 'dark' ? 'bg-[#2d1b4e] border-purple-800/50' : 'glass-card border-red-100'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${theme === 'dark' ? 'bg-red-900/20 shadow-red-900/10' : 'bg-red-50 shadow-red-100'}`}>
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lang === 'zh' ? '提示' : lang === 'ja' ? 'ヒント' : 'Hint'}</h3>
            <p className={`text-sm mb-8 leading-relaxed ${theme === 'dark' ? 'text-purple-200' : 'text-gray-500'}`}>{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className={`w-full py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg ${theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-white'}`}>{lang === 'zh' ? '好的' : lang === 'ja' ? 'OK' : 'OK'}</button>
          </div>
        </div>
      )}

      {copyrightSuggestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`absolute inset-0 backdrop-blur-md ${theme === 'dark' ? 'bg-[#1a0b2e]/60' : 'bg-white/60'}`} onClick={() => setCopyrightSuggestion(null)}></div>
          <div className={`relative w-full max-w-sm rounded-[32px] p-8 border text-center animate-in zoom-in-95 shadow-2xl ${theme === 'dark' ? 'bg-[#2d1b4e] border-purple-800/50' : 'glass-card border-amber-100'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg ${theme === 'dark' ? 'bg-amber-900/20 shadow-amber-900/10' : 'bg-amber-50 shadow-amber-100'}`}>
              <Sparkles className="text-amber-500" size={32} />
            </div>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lang === 'zh' ? '💡 创作建议' : lang === 'ja' ? '💡 創作のヒント' : '💡 Creative Hint'}</h3>
            <p className={`text-sm mb-8 leading-relaxed text-left ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>{copyrightSuggestion}</p>
            <button onClick={() => setCopyrightSuggestion(null)} className={`w-full py-4 rounded-2xl font-bold active:scale-95 transition-all shadow-lg ${theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-gray-900 text-white'}`}>{lang === 'zh' ? '去修改' : lang === 'ja' ? '修正する' : 'Edit Prompt'}</button>
          </div>
        </div>
      )}

      {!isSquareOnly && currentView === AppView.RESULT && lastResult ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-8">
            <h2 className={`text-2xl md:text-4xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lastResult.title}</h2>
            <button onClick={() => setView(AppView.HOME)} className={`p-2 rounded-full transition-colors border ${theme === 'dark' ? 'text-purple-300 bg-purple-900/40 border-purple-800/50' : 'text-gray-400 bg-white border-gray-100'}`}><X size={24} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="md:sticky md:top-24 space-y-6">
              <ActionFigure3DViewer images={lastResult.imageUrls} theme={theme} />
              <div className="flex gap-4">
                <button onClick={toggleFavorite} className={`h-16 w-16 rounded-[24px] flex items-center justify-center border transition-all active:scale-95 ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50' : 'bg-gray-50 border-gray-100'}`}>
                  <Heart size={24} className={isFavorited ? 'fill-red-500 text-red-500' : (theme === 'dark' ? 'text-purple-300' : 'text-gray-400')} />
                </button>
                <button onClick={() => { setPendingOrder(lastResult); setView(AppView.CHECKOUT); }} className="flex-1 h-16 rounded-[24px] bg-gradient-to-r from-purple-600 to-pink-600 shadow-[0_15px_30px_rgba(168,85,247,0.3)] flex items-center justify-center space-x-2 font-black text-lg text-white active:scale-95 transition-all">
                  <ShoppingBag size={20} />
                  <span>{lang === 'zh' ? '立即下单实物' : lang === 'ja' ? '今すぐ注文' : 'Checkout Physical'}</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-8">
              {lastResult.storyCard && (
                <div className={`p-6 rounded-[32px] border ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles size={16} className="text-purple-500" />
                    <h4 className={`font-black uppercase tracking-widest text-xs ${theme === 'dark' ? 'text-purple-300' : 'text-gray-900'}`}>{lang === 'zh' ? 'IP 故事卡' : lang === 'ja' ? 'IP ストーリーカード' : 'IP STORY CARD'}</h4>
                  </div>
                  <p className={`text-sm leading-relaxed italic ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>“{lastResult.storyCard}”</p>
                  <div className="mt-4 text-[10px] font-black uppercase tracking-widest text-purple-500/40">SELINDELL IP ARCHIVE</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
          {!isSquareOnly && (
            <>
              <div className="mt-0 mb-4 text-center relative">
                <div className={`inline-block mb-3 px-4 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-purple-900/40 border-purple-700/50' : 'bg-purple-50 border-purple-100'}`}>
                  <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t.tag}</span>
                </div>
                <div className="mb-2 text-center">
                  <span className={`text-transparent bg-clip-text text-5xl md:text-7xl font-black tracking-[0.2em] uppercase italic drop-shadow-sm ${theme === 'dark' ? 'bg-gradient-to-r from-white to-gray-500' : 'bg-gradient-to-r from-gray-900 to-gray-500'}`}>
                    {lang === 'zh' ? '倾谷' : 'Selindell'}
                  </span>
                </div>
                <h1 className={`text-2xl md:text-4xl font-black mb-3 tracking-tight leading-tight flex items-center justify-center ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Selindell <span className="ml-2 px-3 py-1 rounded-full text-sm bg-gradient-to-r from-[#FF4A26] to-[#FF8A00] text-white shadow-lg shadow-[#FF4A26]/20">造物舱</span>
                </h1>
              </div>

              {/* Hero Section */}
              <div className={`mt-0 mb-8 w-full h-40 md:h-56 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border relative ${theme === 'dark' ? 'border-[#333]' : 'border-gray-200'}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 flex flex-col justify-end p-6">
                  <span className="text-[#FFE8A1] text-[10px] font-black tracking-widest uppercase mb-1">Selindell 万物造物</span>
                  <h2 className="text-white text-xl font-bold tracking-tight">专属于你——独一无二</h2>
                </div>
                <img 
                  src="/hero.png" 
                  className="w-full h-full object-cover object-center" 
                  alt="Hero"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="relative mb-8" ref={inputSectionRef}>
                 <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-4 bg-[#FF4A26] rounded-full"></div>
                      <span className={`text-[13px] font-black tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lang === 'zh' ? '输入你的灵感' : t.exampleHint}</span>
                    </div>
                 </div>

                 <div className={`rounded-3xl p-6 md:p-8 relative border shadow-sm transition-all duration-500 focus-within:ring-2 focus-within:ring-[#FF4A26]/50 ${theme === 'dark' ? 'bg-[#1C1C1E] border-[#333]' : 'bg-white border-gray-200'}`}>
                    <div className="flex mb-14">
                      <textarea
                        className={`flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-base md:text-lg font-medium h-24 md:h-32 resize-none leading-relaxed no-scrollbar ${theme === 'dark' ? 'text-white placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'}`}
                        placeholder={lang === 'zh' ? '输入想象（我想要一个穿西装的狮子的手办），也可以点击下方上传自拍做成手办...' : t.placeholder}
                        value={prompt}
                        maxLength={500}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex items-end sm:items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                          {referenceImage ? (
                            <div className="relative group z-10">
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-12 h-12 rounded-xl border-2 shadow-sm overflow-hidden flex items-center justify-center active:scale-95 transition-all duration-300 ${theme === 'dark' ? 'border-[#FF4A26] bg-[#1a0b2e]' : 'border-[#FF4A26] bg-white'}`}
                                title={lang === 'zh' ? '更改图片' : 'Change Image'}
                              >
                                <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setReferenceImage(null); }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
                              >
                                <X size={12} strokeWidth={3} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className={`group flex items-center justify-center space-x-1.5 px-1 py-1 rounded-full transition-all duration-300 ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                              <div className={`p-1.5 rounded-full border transition-colors ${theme === 'dark' ? 'border-gray-600 group-hover:border-white group-hover:bg-white/10' : 'border-gray-400 group-hover:border-gray-900 group-hover:bg-gray-100'}`}>
                                <ImagePlus size={16} strokeWidth={2.5} />
                              </div>
                              <span className="text-xs font-bold">{lang === 'zh' ? '+ 图片(可选)' : '+ Image'}</span>
                            </button>
                          )}
                        </div>
                        <div className="hidden sm:flex flex-wrap gap-2 items-center">
                          {(t.samples || []).map((sample: string, i: number) => (
                            <button key={i} onClick={() => setPrompt(sample)} className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] border transition-colors ${theme === 'dark' ? 'bg-gray-800/80 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'}`}>
                              {sample}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="mb-10">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className={`text-[13px] font-black tracking-widest uppercase ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lang === 'zh' ? '风格选择' : t.styleTitle}</h3>
                  <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>选择预设模型比例</span>
                </div>
                <div className="grid grid-cols-4 gap-3 px-1 md:gap-4">
                  {CREATION_STYLES.map((style) => {
                    const isSelected = selectedStyleId === style.id;
                    return (
                      <button key={style.id} onClick={() => setSelectedStyleId(style.id)} className={`group relative flex flex-col items-center transition-all duration-300 ${isSelected ? '' : 'hover:scale-105'}`}>
                        <div className={`w-full aspect-square rounded-[18px] overflow-hidden mb-2 border-2 transition-all duration-300 relative ${isSelected ? 'border-[#FF4A26] shadow-sm scale-110' : theme === 'dark' ? 'border-[#333] bg-[#1C1C1E]' : 'border-gray-100 bg-gray-50'}`}>
                          <img src={style.imageUrl} className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60'}`} referrerPolicy="no-referrer" />
                          {isSelected && <div className="absolute inset-0 bg-[#FF4A26]/10 flex items-center justify-center"><Check size={18} strokeWidth={3} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" /></div>}
                        </div>
                        <p className={`text-[10px] font-black text-center tracking-tighter transition-all duration-300 ${isSelected ? 'text-[#FF4A26]' : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          {(t.styles as any)?.[style.id] || style.id.toUpperCase()}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleGenerateClick}
                disabled={(!prompt.trim() && !referenceImage) || isGenerating}
                className={`w-full h-16 rounded-[20px] flex items-center justify-center font-black text-lg transition-all relative overflow-hidden group mb-16 ${
                  (prompt.trim() || referenceImage) && !isGenerating 
                    ? 'bg-gradient-to-r from-[#111111] to-[#333333] text-[#FFE8A1] shadow-[0_8px_30px_rgba(0,0,0,0.12)] active:scale-[0.98]' 
                    : 'bg-[#F2F2F7] dark:bg-[#1C1C1E] text-gray-300 dark:text-gray-700 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isGenerating ? <Loader2 className="animate-spin text-white" size={20} /> : <Zap size={20} className={(!prompt.trim() && !referenceImage) ? '' : 'text-[#FFE8A1]'} />}
                  <span className="relative z-10 tracking-wider font-bold text-[17px]">{isGenerating ? (lang === 'zh' ? '正在渲染物理参数...' : t.generating) : (lang === 'zh' ? '开始造手办' : t.generateBtn)}</span>
                </div>
                {!isGenerating && (prompt.trim() || referenceImage) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                )}
              </button>
            </>
          )}

          <div className={`${isSquareOnly ? 'pt-0' : `pt-10 border-t ${theme === 'dark' ? 'border-purple-900/30' : 'border-slate-100'}`}`}>
            <div className="mb-10 text-center relative">
              <div className={`inline-flex items-center space-x-2 mb-3 px-4 py-1.5 rounded-full border ${theme === 'dark' ? 'bg-purple-900/40 border-purple-700/50' : 'bg-purple-50 border-purple-100'}`}>
                <Sparkles size={12} className="text-purple-600 animate-pulse" />
                <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t.squareTag}</span>
              </div>
              <h2 className={`text-3xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.squareTitle}</h2>
              <p className={`text-xs mt-2 font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-purple-300/60' : 'text-slate-400'}`}>{t.squareSub}</p>
              <p className={`text-[10px] mt-3 font-black tracking-[0.2em] uppercase ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>{t.squareAction}</p>
            </div>

            {isSquareLoading ? (
               <div className="columns-2 gap-4 space-y-4 px-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`break-inside-avoid rounded-[24px] overflow-hidden border shadow-sm ${theme === 'dark' ? 'bg-purple-900/10 border-purple-800/20' : 'bg-white border-gray-50'}`}>
                      <div className="aspect-[4/5] skeleton" />
                      <div className="p-4 space-y-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full skeleton" />
                          <div className="h-2 w-1/2 skeleton rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            ) : (
              <div className="columns-2 gap-4 space-y-4 px-1">
                {squareItems.map((item) => (
                  <div key={item.id} onClick={() => setSelectedSquareItem(item)} className={`break-inside-avoid rounded-[24px] overflow-hidden border shadow-sm active:scale-95 transition-all duration-300 group cursor-pointer hover:shadow-xl hover:-translate-y-1 ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
                    <div className={`relative aspect-[4/5] overflow-hidden ${theme === 'dark' ? 'bg-purple-950' : 'bg-gray-50'}`}>
                      <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                      {/* 点赞按钮和计数 */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLike(item); }}
                        className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/20 backdrop-blur-md transition-all active:scale-90 hover:bg-black/40"
                      >
                        <Heart 
                          size={16} 
                          className={likedItems.has(item.id) ? 'fill-red-500 text-red-500' : 'text-white'} 
                        />
                        <span className="text-xs text-white font-bold">{item.likeCount || 0}</span>
                      </button>
                      {item.id.startsWith('official') && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/20">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest">{t.officialPick}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className={`text-sm font-bold truncate mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.title || (item.prompt ? item.prompt.slice(0, 15) + '...' : '未知造物')}
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-5 h-5 rounded-full overflow-hidden border ${theme === 'dark' ? 'border-purple-700/50 bg-purple-900' : 'border-gray-100 bg-gray-50'}`}>
                          <img src={item.creatorAvatar} className="w-full h-full object-cover" />
                        </div>
                        <span className={`text-[11px] font-bold truncate ${theme === 'dark' ? 'text-purple-200' : 'text-gray-700'}`}>{item.creatorName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedSquareItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`absolute inset-0 backdrop-blur-xl ${theme === 'dark' ? 'bg-[#1a0b2e]/80' : 'bg-white/80'}`} onClick={() => setSelectedSquareItem(null)}></div>
          <div className={`relative w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar rounded-[40px] border shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-300 ${theme === 'dark' ? 'bg-[#2d1b4e] border-purple-800/50' : 'bg-white border-gray-100'}`}>
            <button 
              onClick={() => setSelectedSquareItem(null)}
              className={`absolute top-6 right-6 z-10 p-2 rounded-full active:scale-90 transition-all ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300' : 'bg-gray-100 text-gray-400'}`}
            >
              <X size={20} />
            </button>
            
            <div className="p-2">
              <div className={`aspect-square rounded-[36px] overflow-hidden mb-6 ${theme === 'dark' ? 'bg-purple-950' : 'bg-gray-50'}`}>
                <img src={selectedSquareItem.imageUrl} className="w-full h-full object-cover" />
              </div>
              <div className="px-6 pb-10">
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{selectedSquareItem.title}</h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleLike(selectedSquareItem)}
                      className={`p-2 rounded-full transition-all active:scale-90 ${theme === 'dark' ? 'bg-purple-900/40' : 'bg-gray-100'}`}
                    >
                      <Heart 
                        size={20} 
                        className={likedItems.has(selectedSquareItem.id) ? 'fill-red-500 text-red-500' : (theme === 'dark' ? 'text-purple-300' : 'text-gray-400')} 
                      />
                    </button>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${theme === 'dark' ? 'text-purple-300 bg-purple-900/60' : 'text-purple-500 bg-purple-50'}`}>{selectedSquareItem.style}</span>
                  </div>
                </div>
                
                {selectedSquareItem.storyCard && (
                  <div className={`mt-6 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-gray-50 border-gray-100'}`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{lang === 'zh' ? '故事卡' : 'Story Card'}</span>
                    <p className={`text-xs leading-relaxed font-medium italic ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>“{selectedSquareItem.storyCard}”</p>
                  </div>
                )}
                
                <div className={`mt-6 p-4 rounded-2xl border ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-gray-400'}`}>{lang === 'zh' ? '灵感描述' : 'Inspiration'}</span>
                  <p className={`text-xs leading-relaxed font-medium ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>“{selectedSquareItem.prompt}”</p>
                </div>
                
                <div className={`mt-8 pt-8 border-t text-center ${theme === 'dark' ? 'border-purple-800/30' : 'border-gray-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-purple-500/60' : 'text-gray-300'}`}>Inspiration Shared by {selectedSquareItem.creatorName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`hidden md:flex fixed bottom-24 right-6 z-50 transition-all duration-500 transform ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'}`}>
        <button onClick={scrollToInput} className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-xl border border-gray-100 flex items-center justify-center text-gray-400 shadow-[0_12px_24px_rgba(0,0,0,0.06)] active:scale-90 hover:text-purple-600 transition-all">
          <ChevronUp size={24} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default Home;
