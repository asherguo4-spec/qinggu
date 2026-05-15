import React, { useEffect, useState } from 'react';
import { Compass, ExternalLink } from 'lucide-react';

const WechatOverlay: React.FC = () => {
  const [isWechatOrQQ, setIsWechatOrQQ] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isWx = ua.includes('micromessenger');
    const isQQ = ua.includes('qq/') || ua.includes('mqqbrowser');
    
    if (isWx || isQQ) {
      setIsWechatOrQQ(true);
    }
  }, []);

  if (!isWechatOrQQ) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex flex-col items-center pt-12 px-6">
      {/* Arrow pointing to top right */}
      <div className="absolute top-4 right-6 animate-bounce">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
          <path d="M12 4L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 4H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 4V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 4C14 12 10 16 4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="bg-white/10 border border-white/20 p-6 rounded-2xl max-w-sm w-full mt-20 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
          <Compass className="text-white" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">
          请在外部浏览器打开
        </h2>
        <p className="text-white/80 text-sm leading-relaxed">
          为了获得完整的造物体验和更快的访问速度，请点击右上角的 <span className="font-bold text-purple-400">···</span> 按钮，选择<span className="font-bold text-white">「在浏览器中打开」</span>或<span className="font-bold text-white">「在 Safari 中打开」</span>。
        </p>
      </div>

      <div className="mt-auto mb-12 flex flex-col items-center space-y-2 opacity-50">
        <ExternalLink className="text-white" size={24} />
        <span className="text-white text-xs">Selindell Forge</span>
      </div>
    </div>
  );
};

export default WechatOverlay;
