import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { toPng } from 'html-to-image';
import { X, Copy, Download, Share2, CheckCircle2 } from 'lucide-react';
import { GeneratedCreation } from '../types';

interface SharePopupProps {
  order: GeneratedCreation;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const SharePopup: React.FC<SharePopupProps> = ({ order, onClose, theme }) => {
  const posterRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const shareUrl = `${window.location.origin}/square/${order.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`来看看我的造物杰作：${order.title}\n${shareUrl}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.warn('Failed to copy', err);
    }
  };

  const downloadPoster = async () => {
    if (!posterRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(posterRef.current, { cacheBust: true, quality: 0.95 });
      const link = document.createElement('a');
      link.download = `Selindell-${order.title}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate poster', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-[#2d1b4e] border border-purple-800' : 'bg-white border border-gray-100'}`}>
        
        {/* Header Options */}
        <div className="flex justify-between items-center p-4">
          <h3 className={`font-bold flex items-center space-x-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <Share2 size={18} />
            <span>分享作品</span>
          </h3>
          <button onClick={onClose} className={`p-1.5 rounded-full ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content area so it fits on small screens */}
        <div className="max-h-[70vh] overflow-y-auto w-full p-4 flex flex-col items-center">
            {/* The Poster to generate */}
            <div 
              ref={posterRef} 
              className={`w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden border ${theme === 'dark' ? 'bg-[#1a0b2e] border-purple-800' : 'bg-white border-gray-200'}`}
              style={{ padding: '0 0 20px 0' }}
            >
              <div className="aspect-square w-full relative">
                <img src={order.imageUrl} alt={order.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
              </div>
              <div className="px-5 pt-5 flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h4 className={`text-lg font-black leading-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{order.title}</h4>
                  <p className={`text-xs leading-relaxed line-clamp-3 ${theme === 'dark' ? 'text-purple-200/80' : 'text-gray-600'}`}>{order.prompt}</p>
                </div>
                <div className={`p-2 rounded-xl bg-white border ${theme === 'dark' ? 'border-purple-800/50' : 'border-gray-100'}`}>
                  <QRCode value={shareUrl} size={64} level="L" />
                </div>
              </div>
              <div className="px-5 mt-6 flex items-center space-x-2 opacity-60">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500"></div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Selindell Forge</span>
              </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className={`p-4 border-t flex gap-3 ${theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
          <button 
            onClick={copyToClipboard}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm transition-all ${isCopied ? 'bg-green-500 text-white' : theme === 'dark' ? 'bg-purple-900/50 text-purple-200 hover:bg-purple-800/50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {isCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            <span>{isCopied ? '已复制链接' : '复制链接'}</span>
          </button>
          
          <button 
            onClick={downloadPoster}
            disabled={isDownloading}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm text-white transition-all ${isDownloading ? 'opacity-70 bg-purple-500' : 'bg-purple-600 hover:bg-purple-500'}`}
          >
            {isDownloading ? (
               <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <Download size={18} />
            )}
            <span>保存精美海报</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default SharePopup;
