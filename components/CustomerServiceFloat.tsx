import React, { useState } from 'react';
import { MessageCircle, X, QrCode } from 'lucide-react';

const CustomerServiceFloat: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'dark' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[90]">
      {isOpen && (
        <div className={`absolute bottom-16 right-0 mb-4 w-72 p-6 rounded-3xl shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-2 ${theme === 'dark' ? 'bg-[#2d1b4e]/90 backdrop-blur-xl border border-purple-800/50' : 'bg-white/90 backdrop-blur-xl border border-purple-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>联系客服</h3>
            <button onClick={() => setIsOpen(false)} className={`p-1 rounded-full ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
              <X size={16} />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`w-32 h-32 rounded-xl flex items-center justify-center border-2 border-dashed ${theme === 'dark' ? 'border-purple-500/30' : 'border-purple-200'} bg-white p-2`}>
              {/* 这里放真实的微信二维码图片 */}
              <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center rounded-lg">
                 <QrCode className="text-gray-400 mb-2" size={32} />
                 <span className="text-[10px] text-gray-400 font-medium">请替换为微信二维码</span>
              </div>
            </div>
            
            <p className={`text-xs text-center leading-relaxed ${theme === 'dark' ? 'text-purple-200/70' : 'text-gray-500'}`}>
              微信号：<span className="font-mono font-bold select-all">SelindellSupport</span><br/>
              请截图保存并在微信中扫码添加<br/>
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
