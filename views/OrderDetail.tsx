
import React, { useState, useEffect } from 'react';
import { GeneratedCreation, AppView } from '../types';
import { ChevronLeft, Package, Truck, CheckCircle, Clock, MapPin, Share2, Globe, Lock, Info, Loader2, Sparkles } from 'lucide-react';
import { translations, LanguageCode } from '../translations';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface OrderDetailProps {
  lang: LanguageCode;
  order: GeneratedCreation;
  onBack: () => void;
  theme: 'light' | 'dark';
  userId: string;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ lang, order, onBack, theme, userId }) => {
  const t = translations[lang as LanguageCode].order_detail;
  const commonT = translations[lang as LanguageCode].common;
  const [isPublic, setIsPublic] = useState(order.isPublic || false);
  const [isForSale, setIsForSale] = useState(order.isForSale || false);
  const [currentSalePrice, setCurrentSalePrice] = useState(order.salePrice || null);
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <Package size={24} className="text-orange-500" />;
      case 'shipping': return <Truck size={24} className="text-blue-500" />;
      case 'completed': return <CheckCircle size={24} className="text-green-500" />;
      default: return <Clock size={24} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    const ordersT = translations[lang].orders;
    switch (status) {
      case 'paid': return ordersT.status_paid;
      case 'shipping': return ordersT.status_shipping;
      case 'completed': return ordersT.status_completed;
      default: return ordersT.status_pending;
    }
  };

  const [isListing, setIsListing] = useState(false);
  const [listType, setListType] = useState<'showcase' | 'sell'>('showcase');
  const [sellPrice, setSellPrice] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const baseCost = 20;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleList = async () => {
    if (!userId) return;
    
    setIsUpdating(true);
    try {
      await setDoc(doc(db, 'orders', order.id), { 
          is_public: true,
          is_for_sale: false, 
          sale_price: null
        }, { merge: true });
      
      setIsListing(false);
      setIsPublic(true);
      setIsForSale(false);
      setCurrentSalePrice(null);
      showToast(lang === 'zh' ? '✨ 已成功发布到灵感广场！' : '✨ Successfully listed on Inspiration Square!');
    } catch (err: any) {
      console.error('Failed to list work:', err);
      showToast(lang === 'zh' ? `发布失败: ${err.message}` : `Failed to list: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnlist = async () => {
    setIsUpdating(true);
    try {
      await setDoc(doc(db, 'orders', order.id), { is_public: false, is_for_sale: false, sale_price: null }, { merge: true });
      
      setIsPublic(false);
      setIsForSale(false);
      setCurrentSalePrice(null);
      showToast(lang === 'zh' ? '✨ 已从灵感广场下架' : '✨ Successfully removed from Inspiration Square');
    } catch (err: any) {
      console.error('Failed to unlist work:', err);
      showToast(lang === 'zh' ? `下架失败: ${err.message}` : `Failed to unlist: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Mock logistics data based on status
  const getLogisticsSteps = () => {
    if (order.status === 'pending') return [];
    
    const steps = [
      { date: new Date(order.timestamp).toLocaleString(), text: lang === 'zh' ? '订单已提交，等待支付' : 'Order submitted, awaiting payment' },
    ];

    if (order.status === 'paid' || order.status === 'shipping' || order.status === 'completed') {
      steps.push({ date: new Date(order.timestamp + 3600000).toLocaleString(), text: lang === 'zh' ? '支付成功，进入排产流程' : 'Payment successful, entering production' });
      steps.push({ date: new Date(order.timestamp + 86400000).toLocaleString(), text: lang === 'zh' ? '3D 打印建模完成' : '3D printing model completed' });
    }

    if (order.status === 'shipping' || order.status === 'completed') {
      steps.push({ date: new Date(order.timestamp + 172800000).toLocaleString(), text: lang === 'zh' ? '包裹已发出，离开造物工厂' : 'Package sent, left the creation factory' });
      steps.push({ date: new Date(order.timestamp + 259200000).toLocaleString(), text: lang === 'zh' ? '到达转运中心' : 'Arrived at the transfer center' });
    }

    if (order.status === 'completed') {
      steps.push({ date: new Date(order.timestamp + 432000000).toLocaleString(), text: lang === 'zh' ? '已送达，感谢您的造物之旅' : 'Delivered, thank you for your creation journey' });
    }

    return steps.reverse();
  };

  const logisticsSteps = getLogisticsSteps();

  return (
    <div className={`min-h-screen pb-32 animate-in slide-in-from-right duration-300 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8 pt-8 px-1">
        <button 
          onClick={onBack} 
          className={`p-3 rounded-full shadow-sm border active:scale-90 transition-all ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-gray-400 border-gray-100'}`}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
          <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>ORD-{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Product Info */}
        <div className="space-y-6">
          <div className={`rounded-[40px] overflow-hidden border shadow-xl ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <div className="aspect-square relative group">
              <img src={order.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="product" />
              <div className="absolute top-6 right-6">
                <div className={`px-4 py-2 rounded-full backdrop-blur-md border flex items-center space-x-2 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white/80 border-gray-100'}`}>
                  {getStatusIcon(order.status)}
                  <span className={`text-xs font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getStatusText(order.status)}</span>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <h3 className={`text-2xl font-black mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{order.title}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-purple-950/40 border-purple-800/30' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.style}</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-purple-100' : 'text-gray-700'}`}>{order.style}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-purple-950/40 border-purple-800/30' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.creation_date}</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-purple-100' : 'text-gray-700'}`}>{new Date(order.timestamp).toLocaleDateString()}</p>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-purple-950/20 border-purple-800/30' : 'bg-gray-50/50 border-gray-100'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{t.prompt}</p>
                <p className={`text-sm leading-relaxed italic ${theme === 'dark' ? 'text-purple-200/80' : 'text-gray-600'}`}>"{order.prompt}"</p>
              </div>

              {/* Story Card Section */}
              {order.storyCard && (
                <div className={`mt-6 rounded-3xl p-6 border relative overflow-hidden group ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-purple-50/30 border-purple-100/50'}`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Sparkles size={40} className="text-purple-500" />
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles size={14} className="text-purple-500" />
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{lang === 'zh' ? 'IP 故事卡' : 'IP STORY CARD'}</h4>
                  </div>
                  <p className={`text-sm font-medium leading-relaxed italic ${theme === 'dark' ? 'text-purple-100' : 'text-gray-700'}`}>
                    “{order.storyCard}”
                  </p>
                  <div className="mt-4 flex items-center space-x-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-purple-500/60' : 'text-gray-300'}`}>
                      SELINDELL IP ARCHIVE
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sell Section */}
          <div className={`rounded-[32px] p-8 border shadow-lg ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                <Sparkles size={20} />
              </div>
              <h4 className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {lang === 'zh' ? '灵感广场状态' : 'Inspiration Square Status'}
              </h4>
            </div>

            {isPublic ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-purple-950/40 border-purple-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-purple-200' : 'text-gray-700'}`}>
                      {lang === 'zh' ? '展示状态' : 'Status'}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-blue-100 text-blue-600`}>
                      {lang === 'zh' ? '仅展示' : 'Showcase Only'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleUnlist}
                  disabled={isUpdating}
                  className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? (lang === 'zh' ? '处理中...' : 'Processing...') : (lang === 'zh' ? '从灵感广场下架' : 'Unlist from Inspiration Square')}
                </button>
              </div>
            ) : (
              !isListing ? (
                <button 
                  onClick={() => setIsListing(true)}
                  className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors"
                >
                  {lang === 'zh' ? '上架到灵感广场' : 'Publish to Inspiration Square'}
                </button>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className={`p-1 rounded-xl flex ${theme === 'dark' ? 'bg-purple-950/40 border border-purple-800' : 'bg-gray-100'}`}>
                    <div className={`flex-1 py-2 rounded-lg text-xs font-bold text-center ${theme === 'dark' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-purple-600 shadow-sm'}`}>
                      {lang === 'zh' ? '仅公开展示' : 'Just Showcase'}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button 
                      onClick={handleList}
                      disabled={isUpdating}
                      className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? (lang === 'zh' ? '处理中...' : 'Processing...') : (lang === 'zh' ? '确认发布' : 'Confirm Publish')}
                    </button>
                    <button 
                      onClick={() => setIsListing(false)}
                      className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${theme === 'dark' ? 'bg-purple-900/40 text-purple-200 hover:bg-purple-800/60' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {commonT.cancel || 'Cancel'}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Logistics */}
        <div className="space-y-6">
          <div className={`rounded-[40px] p-8 border shadow-lg h-full ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center space-x-3 mb-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Truck size={24} />
              </div>
              <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.logistics}</h3>
            </div>

            {logisticsSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'dark' ? 'bg-purple-900/40 text-purple-700' : 'bg-gray-50 text-gray-200'}`}>
                  <Info size={32} />
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300/40' : 'text-gray-400'}`}>{t.logistics_empty}</p>
              </div>
            ) : (
              <div className="relative pl-8 space-y-10">
                {/* Vertical Line */}
                <div className={`absolute left-[15px] top-2 bottom-2 w-0.5 ${theme === 'dark' ? 'bg-purple-800/30' : 'bg-gray-100'}`}></div>
                
                {logisticsSteps.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Dot */}
                    <div className={`absolute -left-[25px] top-1.5 w-4 h-4 rounded-full border-2 z-10 ${idx === 0 ? 'bg-purple-500 border-purple-200 scale-125 shadow-[0_0_12px_rgba(168,85,247,0.4)]' : theme === 'dark' ? 'bg-purple-900 border-purple-800' : 'bg-white border-gray-200'}`}></div>
                    
                    <div className={`transition-all ${idx === 0 ? 'opacity-100' : 'opacity-60'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx === 0 ? 'text-purple-500' : theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{step.date}</p>
                      <p className={`text-sm font-bold leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`mt-12 p-6 rounded-3xl border flex items-start space-x-4 ${theme === 'dark' ? 'bg-blue-900/10 border-blue-800/20' : 'bg-blue-50/30 border-blue-100/50'}`}>
              <MapPin size={20} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">{lang === 'zh' ? '当前位置' : 'Current Location'}</p>
                <p className={`text-xs font-bold ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
                  {order.status === 'completed' ? (lang === 'zh' ? '已签收' : 'Signed and received') : (lang === 'zh' ? '物流中心处理中' : 'Processing at logistics center')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center space-x-2">
            <CheckCircle size={18} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
