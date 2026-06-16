
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
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <Loader2 className="animate-spin text-gray-300" size={24} />
    </div>
  );

  return (
    <div className="py-8 animate-in fade-in duration-500 pb-24">
      <div className="mb-12 px-2 text-center">
        <h2 className="text-xl font-medium text-gray-900 tracking-[0.2em] uppercase">Explore</h2>
        <div className="w-8 h-px bg-gray-200 mx-auto mt-6"></div>
      </div>

      <div className="columns-2 gap-4 space-y-4 px-1">
        {items.map((item) => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className="break-inside-avoid bg-white rounded-xl overflow-hidden active:scale-[0.98] transition-all duration-500 group cursor-pointer"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
              <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.title} />
              {item.id.startsWith('official') && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/20">
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">官方甄选</span>
                </div>
              )}
            </div>
            <div className="pt-3 pb-1">
              <div className="text-xs font-medium text-gray-900 truncate mb-1">
                {item.title || (item.prompt ? item.prompt.slice(0, 15) : 'Untitled')}
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-gray-500 truncate">{item.creatorName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xl" onClick={() => setSelectedItem(null)}></div>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-white animate-in zoom-in-95 duration-500 border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={24} strokeWidth={1.5} />
            </button>
            
            <div className="p-1">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 mb-8 relative">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover" />
              </div>
              <div className="px-6 pb-12">
                <div className="mb-6 text-center">
                  <h3 className="text-xl font-medium text-gray-900 mb-2">{selectedItem.title || 'Untitled'}</h3>
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{selectedItem.style}</span>
                </div>
                
                {selectedItem.stats && selectedItem.lore && (
                  <div className="mb-8 hidden">
                     <StatsCard stats={selectedItem.stats} lore={selectedItem.lore} />
                  </div>
                )}

                {selectedItem.storyCard && (
                  <div className="mb-8 px-4 text-center">
                    <p className="text-sm text-gray-600 leading-relaxed font-serif italic">"{selectedItem.storyCard}"</p>
                  </div>
                )}

                <div className="mb-8 px-4 text-center">
                  <div className="w-4 h-px bg-gray-200 mx-auto mb-4"></div>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">{selectedItem.prompt}</p>
                </div>
                
                <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-50 shrink-0">
                      <img src={selectedItem.creatorAvatar} className="w-full h-full object-cover opacity-90" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mb-0.5">Creator</p>
                      <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{selectedItem.creatorName}</p>
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
