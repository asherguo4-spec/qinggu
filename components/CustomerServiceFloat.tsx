import React, { useState } from 'react';
import { MessageCircle, X, QrCode } from 'lucide-react';

const CustomerServiceFloat: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'dark' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-[90]">
      {isOpen && (
        <div className={`absolute bottom-16 right-0 mb-4 w-72 p-6 rounded-3xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-[#2d1b4e]/90 backdrop-blur-xl border border-purple-800/50' : 'bg-white/90 backdrop-blur-xl border border-purple-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>联系客服</h3>
            <button onClick={() => setIsOpen(false)} className={`p-1 rounded-full ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X size={16} />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            <div className={`w-full p-4 rounded-2xl flex items-start space-x-3 ${theme === 'dark' ? 'bg-purple-950/40 border border-purple-800/30' : 'bg-gray-50 border border-gray-100'}`}>
               <div className="flex-1">
                 <p className={`text-xs font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>专属客服热线 / Hotline</p>
                 <p className={`font-mono text-sm font-bold select-all ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>+86 19043870943</p>
               </div>
            </div>
            
            <div className={`w-full p-4 rounded-2xl flex items-start space-x-3 ${theme === 'dark' ? 'bg-purple-950/40 border border-purple-800/30' : 'bg-gray-50 border border-gray-100'}`}>
               <div className="flex-1">
                 <p className={`text-xs font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>官方微信号 / WeChat</p>
                 <p className={`font-mono text-sm font-bold select-all flex items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>selindellsupport</p>
               </div>
            </div>

            <div className={`w-full p-4 rounded-2xl border border-dashed ${theme === 'dark' ? 'bg-blue-900/10 border-blue-800/30' : 'bg-blue-50/50 border-blue-200'}`}>
              <h4 className={`text-xs font-black uppercase tracking-widest mb-2 flex items-center ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                订单追踪指南
              </h4>
              <p className={`text-[11px] leading-relaxed font-medium ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-800/70'}`}>
                当您下单完成后，如需查看物流状态，请点击左上角返回主菜单，点击右上角齿轮图标进入个人中心，在「我的订单」即可实时查看进度。
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isOpen ? 'bg-gray-200' : 'bg-purple-600 hover:bg-purple-500'} ${theme === 'dark' && isOpen ? 'bg-gray-800' : ''}`}
      >
        {isOpen ? (
          <X size={24} className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} />
        ) : (
          <MessageCircle size={28} className="text-white" />
        )}
      </button>
    </div>
  );
};

export default CustomerServiceFloat;
