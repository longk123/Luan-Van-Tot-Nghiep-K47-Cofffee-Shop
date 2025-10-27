// src/components/pos/EditOptionsDialog.jsx
import { useEffect, useState } from 'react';
import { api } from '../../api.js';

/**
 * Dialog để sửa options của món đã order
 * Chỉ cho phép sửa khi line còn QUEUED
 */
export default function EditOptionsDialog({ 
  open, 
  line,
  onClose, 
  onConfirm 
}) {
  const [activeTab, setActiveTab] = useState('options');
  const [options, setOptions] = useState([]);
  const [optionLevels, setOptionLevels] = useState({});
  const [toppings, setToppings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Current values
  const [sugar, setSugar] = useState(1.0);
  const [ice, setIce] = useState(1.0);
  const [note, setNote] = useState('');
  const [selectedToppings, setSelectedToppings] = useState({});

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
    if (!open || !line) return;
    
    // Reset về tab tùy chọn
    setActiveTab('options');
    
    // Parse existing options
    const lineOptions = line.options || [];
    const sugarOpt = lineOptions.find(o => o.ma === 'SUGAR');
    const iceOpt = lineOptions.find(o => o.ma === 'ICE');
    
    setSugar(sugarOpt?.he_so || 1.0);
    setIce(iceOpt?.he_so || 1.0);
    setNote(line.ghi_chu || '');
    
    // Parse toppings
    const toppingOpts = {};
    lineOptions.filter(o => o.loai === 'AMOUNT').forEach(opt => {
      toppingOpts[opt.ma] = opt.so_luong || 0;
    });
    setSelectedToppings(toppingOpts);
    
    // Load available options and toppings
    setLoading(true);
    (async () => {
      try {
        // Load PERCENT options
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
        if (line.mon_id) {
          const toppingsRes = await api.getMenuItemToppings(line.mon_id);
          setToppings(toppingsRes?.data || toppingsRes || []);
        }
      } catch (error) {
        console.error('Error loading options/toppings:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, line]);

  const handleConfirm = () => {
    const options = {};
    
    // Add sugar (luôn gửi, kể cả 100% để hiển thị rõ)
    options.SUGAR = { he_so: sugar };
    
    // Add ice (luôn gửi, kể cả 100% để hiển thị rõ)
    options.ICE = { he_so: ice };
    
    // Add toppings (gửi cả so_luong = 0 để backend biết cần xóa)
    Object.entries(selectedToppings).forEach(([ma, soLuong]) => {
      options[ma] = { so_luong: soLuong };
    });
    
    console.log('🔧 EditOptionsDialog - selectedToppings:', selectedToppings);
    console.log('🔧 EditOptionsDialog - Sending options:', options);

    onConfirm?.({ options, note });
  };
  
  const handleClose = () => {
    // Reset state khi đóng
    setSugar(1.0);
    setIce(1.0);
    setNote('');
    setSelectedToppings({});
    setActiveTab('options');
    onClose?.();
  };

  const sugarOption = options.find(o => o.ma === 'SUGAR');
  const sugarLevels = sugarOption ? optionLevels[sugarOption.id] || [] : [];

  const iceOption = options.find(o => o.ma === 'ICE');
  const iceLevels = iceOption ? optionLevels[iceOption.id] || [] : [];

  if (!open || !line) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-[#d4a574]/30 animate-slideUp">
        {/* Header */}
        <div className="px-6 py-5 border-b-2 border-[#e7d4b8] flex items-center justify-between bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] shadow-lg">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Sửa món
            </h3>
            <p className="text-sm text-white/90 mt-1 font-medium">
              {line.ten_mon} {line.ten_bien_the && `• ${line.ten_bien_the}`}
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

        {/* Tabs */}
        <div className="px-6 pt-5 flex gap-3 border-b-2 border-[#e7d4b8] bg-gradient-to-b from-white to-[#fffbf5]">
          <button
            onClick={() => setActiveTab('options')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-3 rounded-t-xl outline-none focus:outline-none relative ${
              activeTab === 'options'
                ? 'border-[#c9975b] text-[#c9975b] bg-white shadow-lg -mb-[2px] scale-105'
                : 'border-transparent text-[#b88749] hover:text-[#c9975b] hover:bg-white/70 hover:scale-102'
            }`}
            style={{ minWidth: 160 }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Độ ngọt & Đá
            </span>
          </button>
          <button
            onClick={() => setActiveTab('topping')}
            className={`px-5 py-3 font-semibold text-sm transition-all border-b-3 rounded-t-xl outline-none focus:outline-none relative ${
              activeTab === 'topping'
                ? 'border-[#c9975b] text-[#c9975b] bg-white shadow-lg -mb-[2px] scale-105'
                : 'border-transparent text-[#b88749] hover:text-[#c9975b] hover:bg-white/70 hover:scale-102'
            }`}
            style={{ minWidth: 140 }}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Topping
            </span>
            {Object.values(selectedToppings).reduce((a, b) => a + b, 0) > 0 && (
              <span className="absolute -top-1 -right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg animate-bounce">
                {Object.values(selectedToppings).reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-[#fffbf5] to-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#e7d4b8]"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#c9975b] absolute top-0"></div>
              </div>
              <p className="text-[#b88749] mt-4 font-medium">Đang tải...</p>
            </div>
          ) : activeTab === 'options' ? (
            <div className="space-y-7">
              {/* Sugar level */}
              {sugarLevels.length > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-md border-2 border-[#e7d4b8]">
                  <label className="flex items-center gap-2 text-base font-bold text-[#8b6f47] mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Độ ngọt
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {sugarLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => setSugar(level.gia_tri)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none focus:outline-none duration-200 ${
                          sugar === level.gia_tri
                            ? 'bg-gradient-to-br from-[#d4a574] via-[#c9975b] to-[#b88749] text-white border-[#b88749] shadow-lg scale-110 ring-4 ring-[#c9975b]/30'
                            : 'bg-white text-[#b88749] border-[#e7d4b8] hover:bg-gradient-to-br hover:from-[#c9975b] hover:to-[#b88749] hover:text-white hover:border-[#b88749] hover:scale-105 hover:shadow-md'
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
                <div className="bg-white rounded-xl p-5 shadow-md border-2 border-[#e7d4b8]">
                  <label className="flex items-center gap-2 text-base font-bold text-[#8b6f47] mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Mức đá
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {iceLevels.map(level => (
                      <button
                        key={level.id}
                        onClick={() => setIce(level.gia_tri)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all outline-none focus:outline-none duration-200 ${
                          ice === level.gia_tri
                            ? 'bg-gradient-to-br from-[#d4a574] via-[#c9975b] to-[#b88749] text-white border-[#b88749] shadow-lg scale-110 ring-4 ring-[#c9975b]/30'
                            : 'bg-white text-[#b88749] border-[#e7d4b8] hover:bg-gradient-to-br hover:from-[#c9975b] hover:to-[#b88749] hover:text-white hover:border-[#b88749] hover:scale-105 hover:shadow-md'
                        }`}
                      >
                        {level.ten}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="bg-white rounded-xl p-5 shadow-md border-2 border-[#e7d4b8]">
                <label className="flex items-center gap-2 text-base font-bold text-[#8b6f47] mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Ghi chú đặc biệt
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Ít đá, nhiều trân châu, ít ngọt..."
                  className="w-full px-4 py-3 border-2 border-[#e7d4b8] rounded-xl text-sm text-[#8b6f47] placeholder-[#c9975b]/50 bg-white focus:outline-none focus:ring-2 focus:ring-[#c9975b] focus:border-[#c9975b] resize-none transition-all shadow-sm"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {toppings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-[#e7d4b8]">
                  <svg className="w-16 h-16 mx-auto mb-3 text-[#e7d4b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm text-[#b88749] font-medium">Món này không có topping</p>
                </div>
              ) : (
                toppings.map(topping => {
                  const count = selectedToppings[topping.ma] || 0;
                  return (
                    <div key={topping.tuy_chon_id} className={`flex items-center justify-between p-4 rounded-xl border-2 shadow-sm transition-all ${count > 0 ? 'bg-gradient-to-r from-[#fef7ed] to-[#fffbf5] border-[#c9975b] shadow-md' : 'bg-white border-[#e7d4b8] hover:border-[#c9975b]'}`}>
                      <div className="flex-1">
                        <p className="font-bold text-[#8b6f47]">{topping.ten}</p>
                        <p className="text-sm text-[#c9975b] font-semibold">
                          +{topping.gia_moi_don_vi?.toLocaleString()}đ/{topping.don_vi}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const newToppings = { ...selectedToppings };
                            if (count > 0) {
                              newToppings[topping.ma] = count - 1;
                            }
                            setSelectedToppings(newToppings);
                          }}
                          disabled={count === 0}
                          className="w-10 h-10 flex items-center justify-center bg-white border-2 border-[#e7d4b8] rounded-full text-[#b88749] font-bold text-lg hover:bg-gradient-to-br hover:from-red-500 hover:to-red-600 hover:text-white hover:border-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:scale-110 active:scale-95 outline-none focus:outline-none"
                        >
                          −
                        </button>
                        <span className={`w-10 text-center font-bold text-lg ${count > 0 ? 'text-[#c9975b]' : 'text-[#b88749]'}`}>{count}</span>
                        <button
                          onClick={() => {
                            const newToppings = { ...selectedToppings };
                            newToppings[topping.ma] = count + 1;
                            setSelectedToppings(newToppings);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#d4a574] via-[#c9975b] to-[#b88749] border-2 border-[#b88749] rounded-full text-white font-bold text-lg hover:shadow-lg transition-all shadow-sm hover:scale-110 active:scale-95 outline-none focus:outline-none"
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
        <div className="px-6 py-5 border-t-2 border-[#e7d4b8] bg-gradient-to-b from-white to-[#fffbf5] flex gap-4 shadow-2xl">
          <button
            onClick={handleClose}
            className="flex-1 py-3.5 px-5 bg-white text-[#b88749] border-2 border-[#e7d4b8] rounded-xl font-bold text-base hover:bg-gradient-to-br hover:from-[#c9975b] hover:to-[#b88749] hover:text-white hover:border-[#b88749] hover:shadow-lg hover:-translate-y-1 transition-all outline-none focus:outline-none shadow-md active:scale-95"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] py-3.5 px-5 bg-gradient-to-br from-[#d4a574] via-[#c9975b] to-[#b88749] text-white border-2 border-[#b88749] rounded-xl font-bold text-base hover:shadow-2xl hover:-translate-y-1 hover:scale-105 transition-all shadow-lg outline-none focus:outline-none active:scale-95"
          >
            ✓ Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}
