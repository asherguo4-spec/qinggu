import React, { useEffect, useState } from 'react';
import { GeneratedCreation, AppView } from '../types';
import { Loader2, RefreshCw, AlertCircle, SearchX, ChevronLeft, Heart, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, documentId } from 'firebase/firestore';
import { translations, LanguageCode } from '../translations';

interface FavoritesProps {
  lang: LanguageCode;
  userId: string;
  setView: (view: AppView) => void;
  theme: 'light' | 'dark';
  onSelectDesign: (design: GeneratedCreation) => void;
}

const Favorites: React.FC<FavoritesProps> = ({ lang, userId, setView, theme, onSelectDesign }) => {
  const t = translations[lang as LanguageCode].favorites;
  const [favorites, setFavorites] = useState<GeneratedCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    if (!userId || userId === 'null' || userId === '') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch favorite records for the user
      const favSnap = await getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId)));

      if (favSnap.empty) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const designIds = favSnap.docs.map(doc => doc.data().design_id);

      // We need to fetch design details from 'works' and 'orders' collections
      // Since 'in' queries are limited to 10 items, we chunk them
      let worksData: any[] = [];
      let ordersData: any[] = [];

      for (let i = 0; i < designIds.length; i += 10) {
        const chunk = designIds.slice(i, i + 10);
        
        try {
          const wSnap = await getDocs(query(collection(db, 'works'), where('id', 'in', chunk)));
          wSnap.forEach(d => worksData.push(d.data()));
        } catch(e) {
          console.error("Works fetch err:", e);
        }

        try {
          const oSnap = await getDocs(query(collection(db, 'orders'), where(documentId(), 'in', chunk)));
          oSnap.forEach(d => ordersData.push({ id: d.id, ...d.data() }));
        } catch(e) {
           console.error("Orders fetch err:", e);
        }
      }

      const formattedWorksData = worksData.map((item: any) => ({
        id: item.id,
        title: item.title || (lang === 'zh' ? 'AI 造物' : 'AI Creation'),
        imageUrl: item.image_url || item.preview_images?.[0] || 'https://picsum.photos/seed/placeholder/400/400',
        imageUrls: item.image_urls || item.preview_images || [],
        style: item.style || 'Custom',
        prompt: item.prompt || '',
        timestamp: new Date(item.created_at || Date.now()).getTime(),
        status: (item.status || 'pending') as any,
        lore: item.lore,
        stats: item.stats,
        storyCard: item.story_card
      }));

      const formattedOrdersData = ordersData.map((item: any) => ({
        id: item.id,
        title: item.prompt ? (item.prompt.slice(0, 15) + '...') : (lang === 'zh' ? 'AI 造物' : 'AI Creation'),
        imageUrl: item.preview_images?.[0] || 'https://picsum.photos/seed/placeholder/400/400',
        imageUrls: item.preview_images || [],
        style: item.style || 'Custom',
        prompt: item.prompt || '',
        timestamp: new Date(item.created_at || Date.now()).getTime(),
        status: (item.status || 'paid') as any,
        storyCard: item.story_card
      }));

      // Combine and remove duplicates (though IDs should be unique across tables)
      const combined = [...formattedWorksData];
      const existingIds = new Set(combined.map(d => d.id));
      formattedOrdersData.forEach((o: any) => {
        if (!existingIds.has(o.id)) {
          combined.push(o);
        }
      });

      setFavorites(combined);
    } catch (err: any) {
      console.error(err);
      setFetchError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFavorites(); }, [userId]);

  const removeFavorite = async (e: React.MouseEvent, designId: string) => {
    e.stopPropagation();
    try {
      const snap = await getDocs(query(collection(db, 'favorites'), where('user_id', '==', userId), where('design_id', '==', designId)));
      snap.forEach(d => deleteDoc(d.ref));
      setFavorites(favorites.filter(f => f.id !== designId));
    } catch (err: any) {
      console.error(err);
      setFetchError(lang === 'zh' ? "取消收藏失败" : "Failed to remove favorite");
    }
  };

  if (loading && favorites.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
      <Loader2 className="animate-spin text-purple-600" size={40} />
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">{lang === 'zh' ? '同步中' : 'Syncing'}</p>
    </div>
  );

  return (
    <div className={`py-8 flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
      <div className="flex justify-between items-center mb-10 px-1 shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setView(AppView.PROFILE)} 
            className={`p-3 rounded-full shadow-sm border active:scale-90 transition-all ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-gray-400 border-gray-100'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
          </div>
        </div>
        <button 
          onClick={fetchFavorites} 
          disabled={loading}
          className={`p-3 rounded-full active:rotate-180 transition-all shadow-sm border ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-slate-400 border-gray-100'} ${loading ? 'opacity-30' : 'hover:bg-gray-50'}`}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {fetchError && (
        <div className="mx-6 mt-6 p-4 bg-red-100 text-red-700 text-xs rounded-xl font-mono whitespace-pre-wrap">
          {fetchError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-700">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 border shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-50'}`}>
              <SearchX size={40} className={theme === 'dark' ? 'text-purple-700' : 'text-gray-200'} />
            </div>
            <h3 className={`text-xl font-black mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.emptyTitle}</h3>
            <p className={`text-xs mb-8 ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-400'}`}>{t.emptySub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {favorites.map((design) => (
              <div 
                key={design.id} 
                onClick={() => onSelectDesign(design)}
                className={`rounded-[32px] p-5 border transition-all group shadow-sm flex items-center space-x-5 cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 hover:border-purple-500' : 'bg-white border-gray-100/60 hover:border-purple-200'}`}
              >
                <div className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 border ${theme === 'dark' ? 'bg-purple-950 border-purple-800/50' : 'bg-gray-50 border-gray-50'}`}>
                  <img src={design.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="product" />
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <h3 className={`font-black text-base truncate mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{design.title}</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-purple-400/60' : 'text-slate-400'}`}>{design.style}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => removeFavorite(e, design.id)}
                  className={`p-3 rounded-full transition-colors ${theme === 'dark' ? 'text-purple-400 hover:bg-purple-800/50' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {fetchError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-50 border border-red-100 rounded-full flex items-center space-x-2 text-red-500 text-[11px] font-bold shadow-lg animate-in slide-in-from-bottom-2">
          <AlertCircle size={14} />
          <span>{fetchError}</span>
        </div>
      )}
    </div>
  );
};

export default Favorites;
