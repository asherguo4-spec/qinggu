
import React, { useEffect, useState } from 'react';
import { GeneratedCreation, AppView } from '../types';
import { Loader2, RefreshCw, AlertCircle, Plus, SearchX, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { translations, LanguageCode } from '../translations';

interface OrdersProps {
  lang: LanguageCode;
  userId: string;
  creations: GeneratedCreation[];
  setView: (view: AppView) => void;
  theme: 'light' | 'dark';
  onSelectOrder: (order: GeneratedCreation) => void;
}

const Orders: React.FC<OrdersProps> = ({ lang, userId, creations, setView, theme, onSelectOrder }) => {
  const t = translations[lang as LanguageCode].orders;
  const [dbOrders, setDbOrders] = useState<GeneratedCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!userId || userId === 'null' || userId === '') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const q = query(
        collection(db, 'orders'),
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);

      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const mappedData: GeneratedCreation[] = (data || [])
        .filter((item: any) => item.status !== 'pending')
        .map((item: any) => ({
        id: item.id,
        title: item.title || (item.prompt ? (item.prompt.slice(0, 15) + '...') : (lang === 'zh' ? 'AI 造物作品' : 'AI Creation')), 
        imageUrl: item.preview_images?.[0] || 'https://picsum.photos/seed/placeholder/200/300', 
        imageUrls: item.preview_images || [],
        style: item.style || (lang === 'zh' ? '默认风格' : 'Default Style'),
        prompt: item.prompt || '',
        timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        status: (item.status || 'pending') as any,
        isPublic: item.is_public,
        isForSale: item.is_for_sale,
        salePrice: item.sale_price,
        storyCard: item.story_card
      }));

      setDbOrders(mappedData);
    } catch (err: any) {
      setFetchError(lang === 'zh' ? "订单同步异常" : "Order sync error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [userId]);

  const combinedOrders = [...dbOrders];
  const existingIds = new Set(combinedOrders.map(o => o.id));
  creations.forEach(c => {
    if (!existingIds.has(c.id)) {
      combinedOrders.push(c);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <Package size={14} className="text-orange-500" />;
      case 'shipping': return <Truck size={14} className="text-blue-500" />;
      case 'completed': return <CheckCircle size={14} className="text-green-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return t.status_paid;
      case 'shipping': return t.status_shipping;
      case 'completed': return t.status_completed;
      default: return t.status_pending;
    }
  };

  if (loading && combinedOrders.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
      <Loader2 className="animate-spin text-purple-600" size={40} />
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">{t.syncing}</p>
    </div>
  );

  return (
    <div className={`py-8 flex flex-col h-full animate-in slide-in-from-right duration-300 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
      <div className="flex justify-between items-center mb-10 px-1 shrink-0">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.manage}</p>
          </div>
        </div>
        <button 
          onClick={fetchOrders} 
          disabled={loading}
          className={`p-3 rounded-full active:rotate-180 transition-all shadow-sm border ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-slate-400 border-gray-100'} ${loading ? 'opacity-30' : 'hover:bg-gray-50'}`}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {combinedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-700">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mb-6 border shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-50'}`}>
              <SearchX size={40} className={theme === 'dark' ? 'text-purple-700' : 'text-gray-200'} />
            </div>
            <h3 className={`text-xl font-black mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.emptyTitle}</h3>
            <p className={`text-xs mb-8 ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-400'}`}>{t.emptySub}</p>
            <button 
              onClick={() => setView(userId ? AppView.HOME : AppView.REGISTER)} 
              className={`px-8 py-4 rounded-2xl border font-black text-sm active:scale-95 transition-all shadow-sm ${theme === 'dark' ? 'bg-purple-600 text-white border-purple-500' : 'bg-white border-purple-100 text-purple-600'}`}
            >
              {userId ? t.emptyBtn : (t as any).loginBtn}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {combinedOrders.map((order) => (
              <div 
                key={order.id} 
                onClick={() => onSelectOrder(order)}
                className={`rounded-[32px] p-5 border transition-all group shadow-sm flex items-center space-x-5 cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 hover:border-purple-500' : 'bg-white border-gray-100/60 hover:border-purple-200'}`}
              >
                <div className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 border ${theme === 'dark' ? 'bg-purple-950 border-purple-800/50' : 'bg-gray-50 border-gray-50'}`}>
                  <img src={order.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="product" />
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border ${theme === 'dark' ? 'bg-purple-900/40 border-purple-800/50' : 'bg-gray-50 border-gray-100'}`}>
                      {getStatusIcon(order.status)}
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-purple-200' : 'text-gray-600'}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold tracking-tighter ${theme === 'dark' ? 'text-purple-400/40' : 'text-slate-300'}`}>ORD-{order.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <h3 className={`font-black text-base truncate mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{order.title}</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-purple-400/60' : 'text-slate-400'}`}>{order.style}</span>
                    <span className={`text-[10px] font-mono font-bold ${theme === 'dark' ? 'text-purple-400/40' : 'text-slate-300'}`}>{new Date(order.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
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

export default Orders;
