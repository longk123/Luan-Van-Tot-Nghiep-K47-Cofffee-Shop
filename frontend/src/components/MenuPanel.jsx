// === src/components/MenuPanel.jsx ===
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import OptionsDialog from './pos/OptionsDialog.jsx';

// QtySizeDialog component
function QtySizeDialog({ open, item, onClose, onConfirm }) {
  const [variants, setVariants] = useState([]);
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

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
    if (!open || !item) return;
    
    // Reset state khi mở dialog mới
    setQty(1);
    setVariantId(null);
    setVariants([]);
    
    setLoading(true);
    api.getMenuItemVariants(item.id)
      .then(res => {
        const data = res?.data || res || [];
        setVariants(data);
        if (data.length > 0) setVariantId(data[0].id);
      })
      .catch(err => console.error('Error loading variants:', err))
      .finally(() => setLoading(false));
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <h3 className="text-xl font-bold text-amber-900">{item.ten}</h3>
          <p className="text-sm text-amber-700 mt-1">Chọn kích cỡ và số lượng</p>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Size selection */}
              {variants.length > 0 && (
                <div>
                  <h4 className="font-semibold text-amber-900 mb-3">Chọn kích cỡ</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setVariantId(variant.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left outline-none focus:outline-none ${
                          variantId === variant.id
                            ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md'
                            : 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-semibold ${
                            variantId === variant.id ? 'text-amber-900' : 'text-amber-700'
                          }`}>{variant.ten_bien_the}</span>
                          <span className={`text-lg font-bold ${
                            variantId === variant.id ? 'text-amber-700' : 'text-amber-600'
                          }`}>
                            {(variant.gia || 0).toLocaleString()}đ
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <h4 className="font-semibold text-amber-900 mb-3">Số lượng</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1}
                    className="w-12 h-12 flex items-center justify-center bg-amber-100 hover:bg-amber-200 rounded-xl text-xl font-bold text-amber-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors outline-none focus:outline-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center text-xl font-bold py-3 border-2 border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-amber-900"
                    min="1"
                  />
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl text-xl font-bold text-white transition-all shadow-md outline-none focus:outline-none"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-amber-200 bg-amber-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border-2 border-amber-300 text-amber-700 rounded-xl font-semibold hover:bg-amber-50 transition-colors outline-none focus:outline-none"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm({ qty, variantId })}
            disabled={variants.length > 0 && !variantId}
            className="flex-[2] py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuPanel({ orderId, onAdded, onShowToast, disabled = false }) {
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState({});
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Dialogs
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [optionsDialog, setOptionsDialog] = useState({ open: false, item: null, variant: null, quantity: 1 });

  useEffect(() => {
    api.getMenuCategories()
      .then(res => {
        const data = res?.data || res || [];
        setCats(data);
        setActiveCat(0);
      })
      .catch(err => console.error('Error loading categories:', err));
  }, []);

  // Load items khi đổi category
  useEffect(() => {
    if (searching) return;
    if (activeCat === null) return;
    
    setLoading(true);
    (async () => {
      try {
        const res = await api.getMenuCategoryItems(activeCat);
        const itemsData = res?.data || res || [];
        setItems(itemsData);
        
        // Load variants for each item
        const variantsData = {};
        for (const item of itemsData) {
          try {
            const variantsRes = await api.getMenuItemVariants(item.id);
            const variants = variantsRes?.data || variantsRes || [];
            variantsData[item.id] = variants;
          } catch (error) {
            variantsData[item.id] = [];
          }
        }
        setVariants(variantsData);
      } finally { setLoading(false); }
    })();
  }, [activeCat, searching]);

  async function handleSearch(e) {
    const kw = e.target.value;
    setSearch(kw);
    if (kw.trim() === '') {
      setSearching(false);
      setActiveCat(activeCat || cats[0]?.id || 0);
      return;
    }
    setSearching(true);
    setLoading(true);
    try {
      const res = await api.searchMenuItems(kw);
      const searchData = res?.data || res || [];
      setItems(searchData);
      
      // Load variants for search results
      const variantsData = {};
      for (const item of searchData) {
        try {
          const variantsRes = await api.getMenuItemVariants(item.id);
          const variants = variantsRes?.data || variantsRes || [];
          variantsData[item.id] = variants;
        } catch (error) {
          variantsData[item.id] = [];
        }
      }
      setVariants(variantsData);
    } finally {
      setLoading(false);
    }
  }

  async function confirmAdd({ qty, variantId }) {
    if (!orderId) return;
    
    const selectedItem = dialog.item;
    setAdding(true);
    
    // Close size dialog, open options dialog
    setDialog({ open: false, item: null });
    
    const selectedVariant = variants[selectedItem.id]?.find(v => v.id === variantId) || null;
    setOptionsDialog({
      open: true,
      item: selectedItem,
      variant: selectedVariant,
      quantity: qty
    });
    
    setAdding(false);
  }

  async function confirmOptions(cupsData) {
    setAdding(true);
    try {
      const { item, variant, quantity } = optionsDialog;
      
      console.log('📥 MenuPanel confirmOptions received:', cupsData);
      
      // Convert frontend format to backend format
      const cups = cupsData.map(cupData => ({
        ghi_chu: cupData.note || null,
        tuy_chon: cupData.options  // Backend expects "tuy_chon" not "options"
      }));
      
      const payload = {
        mon_id: item.id,
        bien_the_id: variant?.id || null,
        don_gia: variant?.gia || item.gia_mac_dinh || item.gia || 0,
        cups: cups  // Send as cups array
      };
      
      console.log('📤 Sending to API:', payload);
      await api.addOrderItem(orderId, payload);

      setOptionsDialog({ open: false, item: null, variant: null, quantity: 1 });
      onAdded?.();
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Đã thêm món',
        message: `Thêm ${quantity} ${item.ten} vào đơn hàng.`
      });
    } catch (err) {
      console.error('Error adding item:', err);
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi thêm món',
        message: err.message || 'Không thể thêm món vào đơn hàng.'
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="px-4 py-4 border-b-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Tìm món..."
            value={search}
            onChange={handleSearch}
            className="w-full bg-white border-2 border-amber-300 rounded-xl pl-10 pr-4 py-3 text-sm text-amber-900 placeholder-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 hover:border-amber-400 transition-all shadow-md hover:shadow-lg font-medium"
          />
        </div>
      </div>

      {/* Categories tabs */}
      <div className="px-4 py-3 border-b-2 border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => { setActiveCat(0); setSearching(false); setSearch(''); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 outline-none focus:outline-none flex items-center gap-2 ${
              activeCat === 0 
                ? 'bg-gradient-to-r from-[#d4a574] to-[#c9975b] text-white shadow-lg scale-105 border-2 border-[#c9975b]' 
                : 'bg-white text-[#8B6F47] hover:bg-[#FEF7ED] hover:scale-105 border-2 border-[#d4a574]/30 hover:border-[#c9975b] shadow-sm hover:shadow-md'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Tất cả
          </button>
          {cats.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveCat(c.id); setSearching(false); setSearch(''); }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 outline-none focus:outline-none ${
                activeCat === c.id 
                  ? 'bg-gradient-to-r from-[#d4a574] to-[#c9975b] text-white shadow-lg scale-105 border-2 border-[#c9975b]' 
                  : 'bg-white text-[#8B6F47] hover:bg-[#FEF7ED] hover:scale-105 border-2 border-[#d4a574]/30 hover:border-[#c9975b] shadow-sm hover:shadow-md'
              }`}
            >
              {c.ten}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-amber-50/50 to-white scrollbar-thin">
        {loading ? (
          <div className="p-4 text-amber-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-2"></div>
            Đang tải món...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {items.map((m) => {
              const itemVariants = variants[m.id] || [];
              const hasVariants = itemVariants.length > 0;
              
              return (
                <div key={m.id} className="border-2 border-amber-200 rounded-2xl overflow-hidden bg-white hover:shadow-xl hover:border-amber-400 transition-all">
                  {m.hinh_anh ? (
                    <img src={m.hinh_anh} alt={m.ten} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-amber-50 to-orange-50 grid place-items-center text-amber-400 text-3xl">☕</div>
                  )}
                  <div className="p-3 bg-gradient-to-b from-white to-amber-50/30">
                    <div className="font-bold text-base truncate mb-1 text-amber-900" title={m.ten}>{m.ten}</div>
                    
                    {/* Hiển thị giá */}
                    <div className="text-sm font-semibold text-amber-700 mb-2">
                      {(() => {
                        // Check variants trước (nếu có nhiều size)
                        if (hasVariants && itemVariants.length > 0) {
                          const prices = itemVariants.map(v => v.gia || 0).filter(p => p > 0);
                          
                          if (prices.length > 1) {
                            // Nhiều size với giá khác nhau
                            return `${Math.min(...prices).toLocaleString()}₫ - ${Math.max(...prices).toLocaleString()}₫`;
                          } else if (prices.length === 1) {
                            // Chỉ 1 size
                            return `${prices[0].toLocaleString()}₫`;
                          }
                        }
                        
                        // Nếu không có variants, dùng giá mặc định (gia_mac_dinh hoặc gia)
                        const price = m.gia_mac_dinh || m.gia;
                        if (price && price > 0) {
                          return `${price.toLocaleString()}₫`;
                        }
                        
                        // Fallback
                        return 'Liên hệ';
                      })()}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (disabled) {
                          onShowToast?.({
                            show: true,
                            type: 'warning',
                            title: 'Không thể thêm món',
                            message: 'Đơn hàng này đã được thanh toán. Vui lòng tạo đơn mới để thêm món.'
                          });
                          return;
                        }
                        if (adding) return;
                        setDialog({ open: true, item: m });
                      }}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-base transition-all duration-200 outline-none focus:outline-none text-center border-2 flex items-center justify-center gap-2 ${
                        disabled 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300' 
                          : 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-[#c9975b] hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:-translate-y-0.5 active:scale-95'
                      } ${adding ? 'opacity-50' : ''}`}
                      style={{ overflow: 'visible', whiteSpace: 'nowrap', fontFamily: 'system-ui, sans-serif' }}
                    >
                      {disabled ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Đã thanh toán
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Thêm
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
            {!items.length && (
              <div className="text-amber-600">
                {search ? 'Không tìm thấy món phù hợp.' : 'Không có món trong danh mục này.'}
              </div>
            )}
          </div>
        )}
      </div>

      <QtySizeDialog
        open={dialog.open}
        item={dialog.item}
        onClose={() => setDialog({ open: false, item: null })}
        onConfirm={confirmAdd}
      />

      <OptionsDialog
        open={optionsDialog.open}
        item={optionsDialog.item}
        selectedVariant={optionsDialog.variant}
        quantity={optionsDialog.quantity}
        onClose={() => setOptionsDialog({ open: false, item: null, variant: null, quantity: 1 })}
        onConfirm={confirmOptions}
      />
    </div>
  );
}
