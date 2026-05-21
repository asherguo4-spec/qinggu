
import React, { useEffect, useState } from 'react';
import { GeneratedCreation } from '../types';
import { db } from '../lib/supabase';
import { collection, query, where, getDocs, limit, orderBy } from '../lib/supabase';
import { Loader2, Sparkles, X } from 'lucide-react';
import StatsCard from '../components/StatsCard';

// 扩展类型用于展示作者
interface SquareItem extends GeneratedCreation {
  creatorName?: string;
  creatorAvatar?: string;
}

const Square: React.FC = () => {
  const [items, setItems] = useState<SquareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SquareItem | null>(null);

  useEffect(() => {
    const fetchSquareData = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('status', '!=', 'pending'),
          where('is_public', '==', true),
          orderBy('created_at', 'desc'),
          limit(20)
        );
        const ordersSnap = await getDocs(q);

        const ordersData = ordersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() as any }));

        const userIds = Array.from(new Set(ordersData.map((o: any) => o.user_id).filter(Boolean)));
        let usersMap: Record<string, any> = {};

        if (userIds.length > 0) {
          // split into chunks of 10 for 'in' query safety
          for (let i = 0; i < userIds.length; i += 10) {
            const chunk = userIds.slice(i, i + 10);
            const userQ = query(collection(db, 'users'), where('__name__', 'in', chunk));
            const usersSnap = await getDocs(userQ);
            usersSnap.forEach((uSnap: any) => {
              usersMap[uSnap.id] = { id: uSnap.id, ...uSnap.data() };
            });
          }
        }

        const mapped: SquareItem[] = ordersData.map((item: any) => {
          const user = usersMap[item.user_id];
          return {
            id: item.id,
            title: item.title || (item.prompt ? item.prompt.slice(0, 15) : '未知造物'),
            imageUrl: item.preview_images?.[0] || 'https://picsum.photos/seed/placeholder/400/400',
            imageUrls: item.preview_images || [],
            style: item.style || '自由风格',
            prompt: item.prompt || '',
            timestamp: new Date(item.created_at || item.create_at || Date.now()).getTime(),
            status: 'paid',
            creatorName: user?.nickname || `造物主_${String(item.id).slice(0, 4)}`,
            creatorAvatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`,
            isForSale: item.is_for_sale,
            salePrice: item.sale_price,
            storyCard: item.story_card,
            lore: `${item.style}流派的杰作，源于奇思妙想。`,
            stats: {
               power: Math.floor(Math.random() * 40) + 60,
               agility: Math.floor(Math.random() * 40) + 60,
               soul: Math.floor(Math.random() * 40) + 60,
               rarity: ['SSR', 'SR', 'R'][Math.floor(Math.random() * 3)] as 'SSR' | 'SR' | 'R' | 'UR'
            }
          };
        });
        
        setItems(mapped);
      } catch (e) {
        console.error("Square fetch error:", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSquareData();
  }, []);


  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
      <Loader2 className="animate-spin text-purple-600" size={40} />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Connecting to Inspiration Pool...</p>
    </div>
  );

  return (
    <div className="py-8 animate-in fade-in duration-500">
      <div className="mb-10 text-center relative">
        <div className="inline-flex items-center space-x-2 mb-3 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100">
          <Sparkles size={12} className="text-purple-600 animate-pulse" />
          <span className="text-[10px] font-black tracking-[0.2em] text-purple-600 uppercase">造物灵感广场</span>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">灵感无界 · 智造有形</h2>
        <p className="text-gray-400 text-xs mt-2 font-medium">查看并收藏其他造物主的奇幻杰作</p>
        <p className="text-purple-500 text-[10px] mt-1.5 font-bold tracking-widest">去下单，你的灵感也能上墙</p>
      </div>

      <div className="columns-2 gap-4 space-y-4 px-1">
        {items.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="break-inside-avoid bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm active:scale-95 transition-all duration-300 group cursor-pointer"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
              <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
              {item.id.startsWith('official') && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/20">
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">官方甄选</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="text-sm font-bold text-gray-900 truncate mb-2">
                {item.title || (item.prompt ? item.prompt.slice(0, 15) + '...' : '未知造物')}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                  <img src={item.creatorAvatar} className="w-full h-full object-cover" />
                </div>
                <span className="text-[11px] font-bold text-gray-700 truncate">{item.creatorName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar rounded-[40px] bg-white border border-gray-100 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-6 right-6 z-10 p-2 bg-gray-100 rounded-full text-gray-400 active:scale-90 transition-all"
            >
              <X size={20} />
            </button>
            
            <div className="p-2">
              <div className="aspect-square rounded-[36px] overflow-hidden bg-gray-50 mb-6">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover" />
              </div>
              <div className="px-6 pb-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-black text-gray-900">{selectedItem.title}</h3>
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full">{selectedItem.style}</span>
                </div>
                
                {selectedItem.stats && selectedItem.lore && (
                  <StatsCard stats={selectedItem.stats} lore={selectedItem.lore} />
                )}

                {selectedItem.storyCard && (
                  <div className="mt-6 p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block mb-2">故事卡</span>
                    <p className="text-xs text-purple-900 leading-relaxed font-medium italic">“{selectedItem.storyCard}”</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">灵感描述</span>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">“{selectedItem.prompt}”</p>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                        <img src={selectedItem.creatorAvatar} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Creator</p>
                        <p className="text-xs font-bold text-gray-900 truncate max-w-[100px]">{selectedItem.creatorName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Square;
