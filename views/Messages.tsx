import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react';
import { LanguageCode } from '../translations';

interface MessagesProps {
  lang: LanguageCode;
  theme: 'light' | 'dark';
  userId: string | null;
  onRead?: () => void;
}

interface Notification {
  id: string; // Firebase ids are strings
  title: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

const Messages: React.FC<MessagesProps> = ({ lang, theme, userId, onRead }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    try {
      const q = query(
        collection(db, 'notifications'), 
        where('target_user_id', '==', userId), 
        where('is_active', '!=', false),
        orderBy('is_active'),
        orderBy('created_at', 'desc')
      );
      // Wait, firestore orderBy limitations with inequality. Let's just fetch by target_user_id and filter internally.
      const snap = await getDocs(query(collection(db, 'notifications'), where('target_user_id', '==', userId)));
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data = data.filter(d => d.is_active !== false);
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const readNotifs = JSON.parse(localStorage.getItem('read_notifications') || '[]');
      const processedData = data.map((n: any) => ({
        ...n,
        is_read: n.is_read || readNotifs.includes(n.id)
      }));
      
      setNotifications(processedData);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setFetchError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      // Optimistically update UI
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      if (onRead) onRead();
      
      // Save to localStorage as fallback
      const readNotifs = JSON.parse(localStorage.getItem('read_notifications') || '[]');
      if (!readNotifs.includes(id)) {
        readNotifs.push(id);
        localStorage.setItem('read_notifications', JSON.stringify(readNotifs));
      }
      
      // Update database
      await setDoc(doc(db, 'notifications', id.toString()), { is_read: true }, { merge: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    setSelectedNotification(n);
  };

  if (!userId) {
    return (
      <div className="flex flex-col h-full p-4 pb-24 animate-in fade-in duration-300">
        <h2 className={`text-xl font-black uppercase tracking-tighter mb-6 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {lang === 'zh' ? '消息通知' : lang === 'en' ? 'Messages' : lang === 'ja' ? 'メッセージ' : lang === 'ar' ? 'رسائل' : lang === 'fr' ? 'Messages' : '消息'}
        </h2>
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
            <span className="text-3xl">🔒</span>
          </div>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-purple-300/60' : 'text-slate-500'}`}>
            {lang === 'zh' ? '请先登录查看消息' : lang === 'en' ? 'Please login to view messages' : lang === 'ja' ? 'メッセージを表示するにはログインしてください' : lang === 'ar' ? 'يرجى تسجيل الدخول لعرض الرسائل' : lang === 'fr' ? 'Veuillez vous connecter pour voir les messages' : '請先登錄查看消息'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-purple-400">Loading...</div>;
  }

  if (selectedNotification) {
    return (
      <div className={`fixed inset-0 z-50 flex justify-center animate-in slide-in-from-right-8 duration-300 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
        <div className="w-full max-w-6xl flex flex-col h-full relative bg-inherit">
          {/* Header */}
          <div className={`flex items-center px-4 md:px-12 h-20 border-b shrink-0 ${theme === 'dark' ? 'border-purple-900/30' : 'border-gray-100'}`}>
            <button 
              onClick={() => setSelectedNotification(null)}
              className={`p-2 -ml-2 rounded-full mr-2 transition-colors ${theme === 'dark' ? 'hover:bg-purple-900/50 text-purple-200' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className={`text-lg font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {lang === 'zh' ? '消息详情' : lang === 'en' ? 'Message Detail' : lang === 'ja' ? 'メッセージ詳細' : lang === 'ar' ? 'تفاصيل الرسالة' : lang === 'fr' ? 'Détail du message' : '消息詳情'}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 md:px-14 py-8">
            <h1 className={`text-2xl md:text-3xl font-black mb-8 leading-tight ${theme === 'dark' ? 'text-purple-50' : 'text-slate-900'}`}>
              {selectedNotification.title || (lang === 'zh' ? '系统通知' : 'System Notification')}
            </h1>
            
            <div className="flex items-center mb-10">
              <div className={`w-12 h-12 rounded-full overflow-hidden mr-4 border-2 ${theme === 'dark' ? 'border-purple-800' : 'border-purple-100'}`}>
                <img src="https://selindelllogo.vercel.app/selin.png" alt="selindell" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className={`text-base font-bold ${theme === 'dark' ? 'text-purple-200' : 'text-slate-800'}`}>
                  selindell
                </div>
                <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-purple-400/70' : 'text-slate-400'}`}>
                  {new Date(selectedNotification.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className={`text-base md:text-lg leading-relaxed whitespace-pre-wrap ${theme === 'dark' ? 'text-purple-200/90' : 'text-slate-700'}`}>
              {selectedNotification.content || (lang === 'zh' ? '欢迎来到 selindell' : 'Welcome to selindell')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {lang === 'zh' ? '消息通知' : lang === 'en' ? 'Messages' : lang === 'ja' ? 'メッセージ' : lang === 'ar' ? 'رسائل' : lang === 'fr' ? 'Messages' : '消息'}
        </h2>
        <button 
          onClick={fetchNotifications}
          disabled={loading}
          className={`p-2 rounded-full transition-colors ${loading ? 'opacity-50' : ''} ${theme === 'dark' ? 'hover:bg-purple-900/50 text-purple-300' : 'hover:bg-slate-100 text-slate-500'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "animate-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
      </div>
      
      {fetchError && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {fetchError}
        </div>
      )}
      
      {notifications.length === 0 && !loading && !fetchError ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
            <span className="text-3xl">🔔</span>
          </div>
          <p className={`text-sm ${theme === 'dark' ? 'text-purple-300/60' : 'text-slate-500'}`}>
            {lang === 'zh' ? '暂无官方通知' : lang === 'en' ? 'No official notifications yet' : lang === 'ja' ? 'まだ公式通知はありません' : lang === 'ar' ? 'لا توجد إشعارات رسمية بعد' : lang === 'fr' ? 'Aucune notification officielle pour le moment' : '暫無官方通知'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={`p-4 rounded-xl border relative cursor-pointer transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 hover:bg-purple-900/30' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              {!n.is_read && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
              )}
              {/* Sender Header */}
              <div className="flex items-center mb-3">
                <div className={`w-8 h-8 rounded-full overflow-hidden mr-3 border ${theme === 'dark' ? 'border-purple-800' : 'border-purple-100'}`}>
                  <img src="https://selindelllogo.vercel.app/selin.png" alt="selindell" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${theme === 'dark' ? 'text-purple-200' : 'text-slate-800'}`}>
                    selindell
                  </div>
                  <div className={`text-[10px] ${theme === 'dark' ? 'text-purple-500' : 'text-slate-400'}`}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <h3 className={`font-bold ${theme === 'dark' ? 'text-purple-100' : 'text-slate-900'}`}>
                {n.title || (lang === 'zh' ? '系统通知' : 'System Notification')}
              </h3>
              <p className={`text-xs mt-1 line-clamp-1 ${theme === 'dark' ? 'text-purple-300/60' : 'text-slate-500'}`}>
                {n.content || (lang === 'zh' ? '欢迎来到 selindell' : 'Welcome to selindell')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
