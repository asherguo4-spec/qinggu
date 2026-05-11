
export enum AppView {
  HOME = 'home',
  SQUARE = 'square',
  ORDERS = 'orders',
  PROFILE = 'profile',
  GENERATING = 'generating',
  RESULT = 'result',
  CHECKOUT = 'checkout',
  SUCCESS = 'success',
  ADDRESS_LIST = 'address_list',
  CUSTOMER_SERVICE = 'customer_service',
  SETTINGS = 'settings',
  REGISTER = 'register',
  ABOUT_US = 'about_us',
  ORDER_DETAIL = 'order_detail',
  MESSAGES = 'messages',
  FAVORITES = 'favorites'
}

export interface CreationStyle {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
  imageUrl: string;
}

export type CreationStatus = 'pending' | 'paid' | 'shipping' | 'completed';

export interface CreationStats {
  power: number;
  agility: number;
  soul: number;
  rarity: string;
}

export interface GeneratedCreation {
  id: string;
  title: string;
  imageUrl: string;
  imageUrls: string[]; 
  videoUrl?: string;
  lore?: string;
  stats?: CreationStats;
  style: string;
  prompt: string;
  timestamp: number;
  status: CreationStatus;
  isPublic?: boolean;
  storyCard?: string;
  // 新增字段
  isForSale?: boolean;
  salePrice?: number;
  ownerId?: string;
}

export type UserLevel = 'visitor' | 'creator' | 'elite';

export interface UserProfile {
  nickname: string;
  id: string;
  shortId: string; 
  avatar: string;
  email: string;
  bio?: string;
  isRegistered?: boolean;
  level: UserLevel;
  orderCount: number;
  // 新增字段
  balance?: number;
}

export interface Address {
  id: string;
  userId: string; 
  name: string;
  phone: string;
  location: string;
  isDefault: boolean;
}
