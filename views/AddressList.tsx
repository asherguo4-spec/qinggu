
import React, { useState } from 'react';
import { ChevronLeft, Plus, MapPin, User, Phone, Trash2, X, AlertCircle, Globe, Navigation, Building2 } from 'lucide-react';
import { Address, AppView } from '../types';
import { translations, LanguageCode } from '../translations';

interface AddressListProps {
  lang: LanguageCode;
  addresses: Address[];
  onAddAddress: (address: Omit<Address, 'id' | 'isDefault' | 'userId'>) => void;
  onDeleteAddress: (id: string) => void;
  onBack: () => void;
  theme: 'light' | 'dark';
}

const AddressList: React.FC<AddressListProps> = ({ lang, addresses, onAddAddress, onDeleteAddress, onBack, theme }) => {
  const t = translations[lang as LanguageCode].address;
  const commonT = translations[lang as LanguageCode].common;
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    country: lang === 'zh' ? '中国' : 'United States'
  });
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setErrorHint(t.nameReq); return; }
    if (!formData.addressLine1.trim()) { setErrorHint(t.streetReq); return; }
    if (!formData.city.trim()) { setErrorHint(t.cityReq); return; }
    if (!formData.zipCode.trim()) { setErrorHint(t.zipReq); return; }
    if (!formData.phone.trim()) { setErrorHint(t.phoneReq); return; }
    
    const formattedLocation = `${formData.addressLine1}, ${formData.city}, ${formData.state} ${formData.zipCode}, ${formData.country}`;
    
    onAddAddress({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      location: formattedLocation
    });

    setFormData({ 
      name: '', 
      phone: '', 
      addressLine1: '',
      city: '',
      state: '',
      zipCode: '',
      country: lang === 'zh' ? '中国' : 'United States'
    });
    setErrorHint(null);
    setIsAdding(false);
  };

  return (
    <div className={`p-6 pb-24 animate-in slide-in-from-right duration-300 min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e]' : 'bg-[#F8F9FB]'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack} 
            className={`p-3 rounded-full shadow-sm border active:scale-90 transition-all ${theme === 'dark' ? 'bg-purple-900/40 text-purple-300 border-purple-800/50' : 'bg-white text-gray-400 border-gray-100'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
        </div>
        <button 
          onClick={() => { setErrorHint(null); setIsAdding(true); }}
          className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-10 text-center animate-in fade-in zoom-in duration-700">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border relative shadow-sm ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30' : 'bg-white border-gray-100'}`}>
              <MapPin size={40} className={theme === 'dark' ? 'text-purple-700' : 'text-gray-200'} />
            </div>
            <h3 className={`font-black text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.empty}</h3>
            <p className={`text-sm leading-relaxed mb-8 ${theme === 'dark' ? 'text-purple-300/60' : 'text-gray-400'}`}>{t.emptySub}</p>
            <button 
              onClick={() => { setErrorHint(null); setIsAdding(true); }}
              className={`px-10 py-4 rounded-full font-bold text-sm border active:scale-95 transition-all shadow-md ${theme === 'dark' ? 'bg-purple-600 text-white border-purple-500' : 'bg-white border-purple-100 text-purple-600'}`}
            >
              {t.addNew}
            </button>
          </div>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className={`rounded-3xl p-6 relative border shadow-sm transition-colors ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/30 hover:border-purple-500' : 'bg-white border-gray-100 hover:border-purple-200'}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className={`font-black text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{addr.name}</span>
                    <span className={`font-mono text-xs ${theme === 'dark' ? 'text-purple-400/60' : 'text-gray-400'}`}>{addr.phone}</span>
                    {addr.isDefault && (
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-purple-900/60 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>{t.default}</span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed line-clamp-2 pr-8 ${theme === 'dark' ? 'text-purple-200/70' : 'text-gray-500'}`}>{addr.location}</p>
                </div>
                <button 
                  onClick={() => onDeleteAddress(addr.id)}
                  className={`p-1 transition-colors ${theme === 'dark' ? 'text-purple-700 hover:text-red-500' : 'text-gray-300 hover:text-red-500'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4">
          <div className={`absolute inset-0 backdrop-blur-xl ${theme === 'dark' ? 'bg-black/60' : 'bg-white/60'}`} onClick={() => setIsAdding(false)}></div>
          <div className={`w-full max-w-lg rounded-[40px] p-8 animate-in slide-in-from-bottom-full duration-500 relative border shadow-[0_20px_60px_rgba(0,0,0,0.1)] max-h-[90vh] overflow-y-auto no-scrollbar transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1a0b2e] border-purple-800/50' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="space-y-1">
                <h3 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.addNew}</h3>
                <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.globalDetails}</p>
              </div>
              <button onClick={() => setIsAdding(false)} className={`p-1 transition-colors ${theme === 'dark' ? 'text-purple-700 hover:text-white' : 'text-gray-300 hover:text-gray-900'}`}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.fullName}</label>
                <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                  <User size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
                  <input 
                    type="text" 
                    placeholder={lang === 'zh' ? "收货人姓名" : "Recipient's Name"}
                    className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-3 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                    value={formData.name}
                    onChange={(e) => { setFormData({...formData, name: e.target.value}); setErrorHint(null); }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.street}</label>
                <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                  <MapPin size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
                  <input 
                    type="text" 
                    placeholder={t.houseNum}
                    className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-3 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                    value={formData.addressLine1}
                    onChange={(e) => { setFormData({...formData, addressLine1: e.target.value}); setErrorHint(null); }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.city}</label>
                  <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                    <Building2 size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
                    <input 
                      type="text" 
                      placeholder="e.g. New York"
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-3 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={formData.city}
                      onChange={(e) => { setFormData({...formData, city: e.target.value}); setErrorHint(null); }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.state}</label>
                  <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                    <Navigation size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
                    <input 
                      type="text" 
                      placeholder="e.g. NY"
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-3 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={formData.state}
                      onChange={(e) => { setFormData({...formData, state: e.target.value}); setErrorHint(null); }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.zip}</label>
                  <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                    <input 
                      type="text" 
                      placeholder="Code"
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-1 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={formData.zipCode}
                      onChange={(e) => { setFormData({...formData, zipCode: e.target.value}); setErrorHint(null); }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.country}</label>
                  <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                    <Globe size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
                    <input 
                      type="text" 
                      placeholder="Country"
                      className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-3 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                      value={formData.country}
                      onChange={(e) => { setFormData({...formData, country: e.target.value}); setErrorHint(null); }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-[10px] font-black uppercase tracking-[0.2em] px-1 ${theme === 'dark' ? 'text-purple-400/40' : 'text-gray-400'}`}>{t.phone}</label>
                <div className={`flex items-center rounded-2xl p-4 border transition-all ${theme === 'dark' ? 'bg-purple-900/20 border-purple-800/50 focus-within:border-purple-500 focus-within:bg-purple-900/40' : 'bg-gray-50 border-gray-100 focus-within:border-purple-500/50 focus-within:bg-white'}`}>
                  <Phone size={18} className={theme === 'dark' ? 'text-purple-500' : 'text-gray-400'} />
                  <input 
                    type="tel" 
                    placeholder={t.intlFormat}
                    className={`bg-transparent border-none focus:ring-0 text-sm w-full font-bold ml-3 ${theme === 'dark' ? 'text-white placeholder:text-purple-800' : 'text-gray-900 placeholder:text-gray-300'}`}
                    value={formData.phone}
                    onChange={(e) => { setFormData({...formData, phone: e.target.value}); setErrorHint(null); }}
                  />
                </div>
              </div>

              {errorHint && (
                <div className={`flex items-center space-x-2 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${theme === 'dark' ? 'bg-red-900/20 border-red-900/30 text-red-500' : 'bg-red-50 border-red-100 text-red-500'}`}>
                  <AlertCircle size={14} />
                  <span className="text-[11px] font-bold">{errorHint}</span>
                </div>
              )}

              <button 
                type="submit"
                className="w-full h-18 rounded-2xl purple-gradient font-black text-lg shadow-2xl shadow-purple-500/40 mt-4 active:scale-95 transition-all text-white"
              >
                {t.save}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressList;
