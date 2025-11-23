// Modal hiển thị thông tin chi tiết món
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function ItemDetailModal({ open, item, onClose }) {
  const [loading, setLoading] = useState(false);
  const [itemDetail, setItemDetail] = useState(null);
  const [variants, setVariants] = useState([]);
  const [options, setOptions] = useState([]);
  const [toppings, setToppings] = useState([]);

  useEffect(() => {
    if (!open || !item) return;

    loadItemDetail();
  }, [open, item]);

  async function loadItemDetail() {
    if (!item?.id) return;

    setLoading(true);
    try {
      // Load item detail với variants
      const itemRes = await api.get(`/menu/items/${item.id}`);
      const itemData = itemRes?.data || itemRes;
      setItemDetail(itemData);

      // Load variants
      try {
        const variantsRes = await api.getMenuItemVariants(item.id);
        setVariants(variantsRes?.data || variantsRes || []);
      } catch (err) {
        console.error('Error loading variants:', err);
        setVariants([]);
      }

      // Load options
      try {
        const optionsRes = await api.get(`/pos/menu/items/${item.id}/options`);
        setOptions(optionsRes?.data || optionsRes || []);
      } catch (err) {
        console.error('Error loading options:', err);
        setOptions([]);
      }

      // Load toppings
      try {
        const toppingsRes = await api.getMenuItemToppings(item.id);
        setToppings(toppingsRes?.data || toppingsRes || []);
      } catch (err) {
        console.error('Error loading toppings:', err);
        setToppings([]);
      }
    } catch (err) {
      console.error('Error loading item detail:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!open || !item) return null;

  const displayItem = itemDetail || item;

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-2xl max-w-4xl w-full border-2 border-[#d4a574]/30 transform transition-all my-8">
        {/* Header */}
        <div className="px-8 py-6 border-b-2 border-[#e7d4b8] bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] shadow-lg rounded-t-3xl flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-2">{displayItem.ten || displayItem.name}</h3>
            {displayItem.ma && (
              <p className="text-sm text-white/90 font-medium">Mã: {displayItem.ma}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#e7d4b8] border-t-[#c9975b] mx-auto mb-4"></div>
              <p className="text-[#8b6f47] font-semibold text-lg">Đang tải thông tin...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Image */}
              {displayItem.hinh_anh && (
                <div className="rounded-2xl overflow-hidden border-2 border-[#e7d4b8] shadow-lg">
                  <img
                    src={displayItem.hinh_anh}
                    alt={displayItem.ten || displayItem.name}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Description - Nổi bật và chi tiết */}
              <div className="bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-50 rounded-2xl p-6 border-2 border-[#e7d4b8] shadow-lg">
                <h4 className="text-2xl font-bold text-[#8b6f47] mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9975b] to-[#8b6f47] flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Về sản phẩm này
                </h4>
                {displayItem.mo_ta ? (
                  <div className="mt-4">
                    <p className="text-gray-800 leading-relaxed text-lg font-medium whitespace-pre-line">
                      {displayItem.mo_ta}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-white/50 rounded-xl border border-gray-200">
                    <p className="text-gray-600 italic text-center">
                      Chưa có mô tả cho sản phẩm này
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t-2 border-[#e7d4b8] bg-gradient-to-r from-gray-50 to-amber-50/30 rounded-b-3xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#c9975b] to-[#8b6f47] text-white border-2 border-[#8b6f47]
            hover:bg-white hover:from-white hover:to-white hover:text-[#8b6f47] hover:border-[#8b6f47] hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

