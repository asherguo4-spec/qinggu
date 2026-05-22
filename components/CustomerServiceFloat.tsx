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
          
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <p className={`text-sm text-center leading-relaxed ${theme === 'dark' ? 'text-purple-200/90' : 'text-gray-700'}`}>
              添加客服微信号，与我们取得联系：
            </p>
            <div className={`px-4 py-3 rounded-2xl font-mono text-xl font-bold select-all flex items-center justify-center ${theme === 'dark' ? 'bg-purple-950/50 text-white border border-purple-700' : 'bg-gray-100 text-purple-900 border border-gray-200'}`}>
              SelindellSupport
            </div>
            <p className={`text-xs text-center leading-relaxed ${theme === 'dark' ? 'text-purple-200/70' : 'text-gray-500'}`}>
              在线时间: 09:00 - 22:00
            </p>
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
