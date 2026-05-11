
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ActionFigure3DViewerProps {
  images: string[]; // 包含一张 character sheet 图片
  theme?: 'light' | 'dark';
}

const ActionFigure3DViewer: React.FC<ActionFigure3DViewerProps> = ({ images, theme = 'light' }) => {
  const characterSheet = images[0];

  return (
    <div className="relative w-full aspect-square select-none">
      <div className={`w-full h-full rounded-[40px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border relative transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0f081a] border-purple-900/40' : 'bg-[#15101f] border-white/5'}`}>
        <img 
          src={characterSheet} 
          className="w-full h-full object-cover"
          alt="Action Figure Character Sheet"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

export default ActionFigure3DViewer;
