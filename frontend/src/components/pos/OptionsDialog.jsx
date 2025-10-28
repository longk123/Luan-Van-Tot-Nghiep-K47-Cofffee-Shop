// src/components/pos/OptionsDialog.jsx
import { useEffect, useState } from 'react';
import { api } from '../../api.js';

/**
 * Dialog để chọn tùy chọn cho từng ly (Sugar, Ice levels, Topping)
 * Hỗ trợ thêm N ly cùng lúc với options riêng cho từng ly
 */
export default function OptionsDialog({ 
  open, 
  item, 
  selectedVariant, // từ QtySizeDialog
  quantity = 1,    // số lượng ly
  onClose, 
  onConfirm 
}) {
  const [activeTab, setActiveTab] = useState('options'); // 'options' | 'topping'
  const [options, setOptions] = useState([]); // [{id, ma, ten, don_vi, loai}]
  const [optionLevels, setOptionLevels] = useState({}); // {optionId: [{id, ten, gia_tri, thu_tu}]}
  const [toppings, setToppings] = useState([]); // [{tuy_chon_id, ma, ten, don_vi, gia_moi_don_vi}]
  const [loading, setLoading] = useState(false);
  
  // State cho từng ly: cups[cupIndex] = { sugar: 0.5, ice: 1.0, note: "...", toppings: {TOPPING_FLAN: 2} }
  const [cups, setCups] = useState([]);
  const [activeCupIndex, setActiveCupIndex] = useState(0);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    
    // Reset cups khi mở dialog
    const initialCups = Array.from({ length: quantity }, () => ({
      sugar: 1.0,  // Mặc định 100%
      ice: 1.0,    // Mặc định 100%
      note: '',
      toppings: {} // {ma: so_luong}
    }));
    setCups(initialCups);
    setActiveCupIndex(0);
    setActiveTab('options'); // Reset về tab tùy chọn
    
    // Load options và toppings từ API
    setLoading(true);
    (async () => {
      try {
        // Load PERCENT options (Sugar, Ice)
        const optionsRes = await api.getMenuOptions();
        const optionsData = optionsRes?.data || optionsRes || [];
        setOptions(optionsData.filter(o => o.loai === 'PERCENT'));

        const levelsMap = {};
        for (const opt of optionsData.filter(o => o.loai === 'PERCENT')) {
          try {
            const levelsRes = await api.getMenuOptionLevels(opt.id);
            levelsMap[opt.id] = levelsRes?.data || levelsRes || [];
          } catch (err) {
            levelsMap[opt.id] = [];
          }
        }
        setOptionLevels(levelsMap);

        // Load toppings
        if (item?.id) {
          const toppingsRes = await api.getMenuItemToppings(item.id);
          setToppings(toppingsRes?.data || toppingsRes || []);
        }
      } catch (error) {
        console.error('Error loading options/toppings:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, item?.id, quantity]);

  const currentCup = cups[activeCupIndex] || {};

  const updateCurrentCup = (updates) => {
    setCups(prev => {
      const newCups = [...prev];
      newCups[activeCupIndex] = { ...newCups[activeCupIndex], ...updates };
      return newCups;
    });
  };

  const handleApplyToAll = () => {
    const template = cups[activeCupIndex];
    setCups(prev => prev.map(() => ({ ...template })));
  };

  const handleConfirm = () => {
    // Build options payload for each cup
    const cupsData = cups.map(cup => {
      const options = {};
      
      // Add sugar (luôn gửi, kể cả 100% để hiển thị rõ)
      options.SUGAR = { he_so: cup.sugar };
      
      // Add ice (luôn gửi, kể cả 100% để hiển thị rõ)
      options.ICE = { he_so: cup.ice };
      
      // Add toppings
      Object.entries(cup.toppings || {}).forEach(([ma, soLuong]) => {
        if (soLuong > 0) {
          options[ma] = { so_luong: soLuong };
        }
      });
      
      return {
        options,
        note: cup.note || ''
      };
    });

    console.log('🎯 OptionsDialog - Sending cupsData:', cupsData);
    onConfirm?.(cupsData);
  };
  
  const handleClose = () => {
    // Reset state khi đóng
    setCups([]);
    setActiveCupIndex(0);
    setActiveTab('options');
    onClose?.();
  };

  // Get sugar option
  const sugarOption = options.find(o => o.ma === 'SUGAR');
  const sugarLevels = sugarOption ? optionLevels[sugarOption.id] || [] : [];

  // Get ice option
  const iceOption = options.find(o => o.ma === 'ICE');
  const iceLevels = iceOption ? optionLevels[iceOption.id] || [] : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-[#d4a574]/30">
        {/* Header - ENHANCED */}
        <div className="px-6 py-5 border-b-2 border-[#e7d4b8] flex items-center justify-between bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] shadow-lg">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {item?.ten}
            </h3>
            <p className="text-sm text-white/90 mt-1 font-medium">
              {selectedVariant?.ten || 'Mặc định'} • {quantity} ly
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-full transition-all outline-none focus:outline-none hover:scale-110 active:scale-95"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cup selector (if multiple cups) - ENHANCED */}
        {quantity > 1 && (
          <div className="px-6 py-4 bg-gradient-to-br from-[#fef7ed] to-[#e7d4b8]/50 border-b-2 border-[#e7d4b8]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#8b6f47] flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Đang chỉnh ly {activeCupIndex + 1}/{quantity}
              </span>
              <button
                onClick={handleApplyToAll}
                className="text-xs px-4 py-2 bg-gradient-to-r from-[#c9975b] to-[#d4a574] hover:from-[#b88749] hover:to-[#c9975b] text-white rounded-xl transition-all shadow-md font-bold outline-none focus:outline-none hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Áp cho tất cả
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {cups.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCupIndex(idx)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex-shrink-0 outline-none focus:outline-none shadow-md ${
                    activeCupIndex === idx
                      ? 'bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white scale-105 shadow-lg'
                      : 'bg-white text-[#8b6f47] hover:bg-[#fef7ed] hover:scale-105 border-2 border-[#d4a574]/30 hover:border-[#c9975b]'
                  }`}
                >
                  Ly {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs - ENHANCED */}
        <div className="px-6 pt-4 flex gap-3 border-b-2 border-[#e7d4b8] bg-gradient-to-r from-[#fef7ed] to-[#e7d4b8]/30">
          <button
            onClick={() => setActiveTab('options')}
            className={`px-5 py-3 font-bold text-sm transition-all duration-200 border-b-4 outline-none focus:outline-none rounded-t-xl ${
              activeTab === 'options'
                ? 'border-[#c9975b] text-[#8b6f47] bg-white shadow-lg -mb-0.5'
                : 'border-transparent text-[#c9975b] hover:text-[#8b6f47] hover:bg-white/50'
            }`}
          >
            Độ ngọt & Đá
          </button>
          <button
            onClick={() => setActiveTab('topping')}
            className={`px-5 py-3 font-bold text-sm transition-all duration-200 border-b-4 outline-none focus:outline-none rounded-t-xl flex items-center gap-2 ${
              activeTab === 'topping'
                ? 'border-[#c9975b] text-[#8b6f47] bg-white shadow-lg -mb-0.5'
                : 'border-transparent text-[#c9975b] hover:text-[#8b6f47] hover:bg-white/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Topping ({Object.values(currentCup.toppings || {}).reduce((a, b) => a + b, 0)})
          </button>
        </div>

        {/* Content - ENHANCED */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-white to-[#fef7ed]/30 scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#e7d4b8] border-t-[#c9975b] mb-3"></div>
              <p className="text-[#8b6f47] font-semibold">Đang tải...</p>
            </div>
          ) : activeTab === 'options' ? (
            <div className="space-y-6">
              {/* Sugar level - ENHANCED */}
              {sugarLevels.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#c9975b] to-[#d4a574] flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    Độ ngọt
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {sugarLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => updateCurrentCup({ sugar: level.gia_tri })}
                        className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 outline-none focus:outline-none shadow-md ${
                          currentCup.sugar === level.gia_tri
                            ? 'bg-gradient-to-br from-[#c9975b] to-[#d4a574] text-white shadow-xl scale-110 border-2 border-[#b88749]'
                            : 'bg-gradient-to-br from-[#fef7ed] to-[#e7d4b8] text-[#8b6f47] hover:from-[#e7d4b8] hover:to-[#d4a574] hover:text-white hover:scale-105 border-2 border-[#d4a574]/30'
                        }`}
                      >
                        {level.ten}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ice level - ENHANCED */}
              {iceLevels.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-[#8b6f47] mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    Mức đá
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {iceLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => updateCurrentCup({ ice: level.gia_tri })}
                        className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 outline-none focus:outline-none shadow-md ${
                          currentCup.ice === level.gia_tri
                            ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-xl scale-110 border-2 border-cyan-600'
                            : 'bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 hover:from-cyan-100 hover:to-blue-100 hover:scale-105 border-2 border-cyan-200'
                        }`}
                      >
                        {level.ten}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note - ENHANCED */}
              <div>
                <label className="block text-sm font-bold text-[#8b6f47] mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#c9975b] to-[#d4a574] flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  Ghi chú
                </label>
                <textarea
                  value={currentCup.note || ''}
                  onChange={(e) => updateCurrentCup({ note: e.target.value })}
                  placeholder="VD: Ít đá, nhiều trân châu..."
                  className="w-full px-4 py-3 border-2 border-[#d4a574] rounded-2xl text-sm text-[#8b6f47] placeholder-[#c9975b]/50 bg-white focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] resize-none shadow-md transition-all font-medium"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {toppings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#8b6f47]">Món này không có topping</p>
                </div>
              ) : (
                toppings.map(topping => {
                  const count = currentCup.toppings?.[topping.ma] || 0;
                  return (
                    <div key={topping.tuy_chon_id} className="flex items-center justify-between p-4 bg-gradient-to-br from-[#fef7ed] to-[#e7d4b8]/50 rounded-2xl border-2 border-[#d4a574]/30 shadow-md hover:shadow-xl hover:border-[#c9975b] transition-all">
                      <div className="flex-1">
                        <p className="font-bold text-[#8b6f47]">{topping.ten}</p>
                        <p className="text-sm text-[#c9975b] font-bold">
                          +{topping.gia_moi_don_vi?.toLocaleString()}đ/{topping.don_vi}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const newToppings = { ...currentCup.toppings };
                            if (count > 0) {
                              newToppings[topping.ma] = count - 1;
                              if (newToppings[topping.ma] === 0) delete newToppings[topping.ma];
                            }
                            updateCurrentCup({ toppings: newToppings });
                          }}
                          disabled={count === 0}
                          className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] hover:from-[#d4a574] hover:to-[#e7d4b8] border-2 border-[#d4a574]/30 rounded-xl text-[#8b6f47] font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:scale-110 active:scale-95 disabled:scale-100 outline-none focus:outline-none"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-bold text-lg text-[#8b6f47] bg-white px-3 py-2 rounded-xl shadow-sm border-2 border-[#d4a574]/20">{count}</span>
                        <button
                          onClick={() => {
                            const newToppings = { ...currentCup.toppings };
                            newToppings[topping.ma] = count + 1;
                            updateCurrentCup({ toppings: newToppings });
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#c9975b] to-[#d4a574] hover:from-[#b88749] hover:to-[#c9975b] border-2 border-[#b88749] rounded-xl text-white font-bold text-xl transition-all shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 outline-none focus:outline-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer - ENHANCED */}
        <div className="px-6 py-4 border-t-2 border-[#e7d4b8] bg-gradient-to-r from-[#fef7ed] to-[#e7d4b8]/50 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 rounded-xl font-bold transition-all duration-200 shadow-sm hover:shadow-md outline-none focus:outline-none hover:scale-105 active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl font-bold transition-all duration-200 shadow-lg hover:bg-white hover:from-white hover:to-white hover:text-[#c9975b] hover:shadow-xl outline-none focus:outline-none hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Xác nhận ({quantity} ly)
          </button>
        </div>
      </div>
    </div>
  );
}
