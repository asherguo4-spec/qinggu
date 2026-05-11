
import { CreationStyle } from './types';

export const CREATION_STYLES: CreationStyle[] = [
  {
    id: 'cute',
    name: '萌趣Q版',
    description: 'Q萌趣版',
    promptSuffix: 'in a cute chibi toy style, high quality vinyl toy, soft lighting, vibrant colors, 3d render, pop mart style',
    imageUrl: 'https://cutepng.vercel.app/cute.png'
  },
  {
    id: 'cyber',
    name: '赛博朋克',
    description: '赛博朋克',
    promptSuffix: 'in a minimalist cyberpunk toy style, chunky solid shapes, easy to 3d print, smooth vinyl texture, no intricate details, no floating parts, cute cyberpunk aesthetic, pop mart style',
    imageUrl: 'https://cyber-wheat.vercel.app/cyber.png'
  },
  {
    id: 'mecha',
    name: '机甲未来',
    description: '机甲风',
    promptSuffix: 'as a simplified chibi mecha toy, chunky solid blocks, smooth rounded armor, easy to 3d print, no tiny joints and wires, minimalist sci-fi designer toy, pop mart style',
    imageUrl: 'https://futurepng.vercel.app/future.png'
  },
  {
    id: 'retro',
    name: '中华复古',
    description: '中式复古',
    promptSuffix: 'in a minimalist oriental desktop toy style, rounded shapes, simple solid traditional clothing, easy to 3d print, no thin delicate accessories, smooth vinyl texture, pop mart style ancient figure',
    imageUrl: 'https://china-mocha.vercel.app/china.png'
  },
  {
    id: 'pixel',
    name: '马赛克像素',
    description: '乐高像素',
    promptSuffix: 'as a solid chunky block figure toy, simple large voxel blocks, unified continuous mesh, easy to 3d print, no small floating cubes, minimalist blocky aesthetic, clean robust geometry',
    imageUrl: 'https://masaike.vercel.app/masaike.png'
  }
];
