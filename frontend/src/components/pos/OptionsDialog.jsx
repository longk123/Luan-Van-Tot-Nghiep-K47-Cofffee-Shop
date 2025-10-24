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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <h3 className="text-xl font-bold text-amber-900">{item?.ten}</h3>
            <p className="text-sm text-amber-700 mt-1">
              {selectedVariant?.ten || 'Mặc định'} • {quantity} ly
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors outline-none focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cup selector (if multiple cups) */}
        {quantity > 1 && (
          <div className="px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-amber-900">Đang chỉnh ly {activeCupIndex + 1}/{quantity}</span>
              <button
                onClick={handleApplyToAll}
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg transition-all shadow-sm font-semibold outline-none focus:outline-none"
              >
                Áp cho tất cả
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {cups.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCupIndex(idx)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 outline-none focus:outline-none ${
                    activeCupIndex === idx
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-amber-700 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  Ly {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-2 border-b border-amber-200">
          <button
            onClick={() => setActiveTab('options')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 outline-none focus:outline-none ${
              activeTab === 'options'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-amber-600 hover:text-amber-900'
            }`}
          >
            Độ ngọt & Đá
          </button>
          <button
            onClick={() => setActiveTab('topping')}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 outline-none focus:outline-none ${
              activeTab === 'topping'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-amber-600 hover:text-amber-900'
            }`}
          >
            Topping ({Object.values(currentCup.toppings || {}).reduce((a, b) => a + b, 0)})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : activeTab === 'options' ? (
            <div className="space-y-6">
              {/* Sugar level */}
              {sugarLevels.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-3">Độ ngọt</label>
                  <div className="grid grid-cols-7 gap-2">
                    {sugarLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => updateCurrentCup({ sugar: level.gia_tri })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all outline-none focus:outline-none ${
                          currentCup.sugar === level.gia_tri
                            ? 'bg-amber-500 text-white shadow-md scale-105'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {level.ten}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ice level */}
              {iceLevels.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-amber-700 mb-3">Mức đá</label>
                  <div className="grid grid-cols-4 gap-2">
                    {iceLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => updateCurrentCup({ ice: level.gia_tri })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all outline-none focus:outline-none ${
                          currentCup.ice === level.gia_tri
                            ? 'bg-cyan-500 text-white shadow-md scale-105'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        {level.ten}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-amber-700 mb-2">Ghi chú</label>
                <textarea
                  value={currentCup.note || ''}
                  onChange={(e) => updateCurrentCup({ note: e.target.value })}
                  placeholder="VD: Ít đá, nhiều trân châu..."
                  className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg text-sm text-amber-900 placeholder-amber-400 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {toppings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm">Món này không có topping</p>
                </div>
              ) : (
                toppings.map(topping => {
                  const count = currentCup.toppings?.[topping.ma] || 0;
                  return (
                    <div key={topping.tuy_chon_id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex-1">
                        <p className="font-medium text-amber-900">{topping.ten}</p>
                        <p className="text-sm text-amber-600 font-semibold">
                          +{topping.gia_moi_don_vi?.toLocaleString()}đ/{topping.don_vi}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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
                          className="w-8 h-8 flex items-center justify-center bg-white border-2 border-amber-300 rounded-lg text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold text-amber-900">{count}</span>
                        <button
                          onClick={() => {
                            const newToppings = { ...currentCup.toppings };
                            newToppings[topping.ma] = count + 1;
                            updateCurrentCup({ toppings: newToppings });
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 border-2 border-amber-700 rounded-lg text-white hover:from-amber-600 hover:to-amber-700 transition-colors outline-none focus:outline-none"
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-amber-200 bg-amber-50 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 bg-white border-2 border-amber-300 text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-colors outline-none focus:outline-none"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none"
          >
            Xác nhận ({quantity} ly)
          </button>
        </div>
      </div>
    </div>
  );
}
