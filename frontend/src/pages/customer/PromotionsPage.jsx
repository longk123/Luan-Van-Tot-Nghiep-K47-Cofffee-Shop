// Customer Portal - Promotions Page
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../../api/customerApi';
import { Tag, Calendar, Clock, Gift, Percent, ShoppingBag, ArrowRight, Search, Filter, ChevronDown } from 'lucide-react';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL, PERCENT, FIXED, PRODUCT

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading promotions...');
      const response = await customerApi.getPromotions();
      console.log('📦 Full response:', response);
      const data = response.data || response || [];
      console.log('📋 Promotions data:', data);
      setPromotions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error loading promotions:', error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Check if promotion is expiring soon (within 3 days)
  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 3;
  };

  // Get discount display text
  const getDiscountText = (promo) => {
    if (promo.loai_giam === 'PERCENT') {
      return `-${promo.gia_tri}%`;
    } else if (promo.loai_giam === 'FIXED') {
      return `-${promo.gia_tri?.toLocaleString('vi-VN')}đ`;
    } else if (promo.loai_giam === 'PRODUCT') {
      return 'Tặng món';
    }
    return promo.gia_tri;
  };

  // Get promo type label
  const getTypeLabel = (type) => {
    switch (type) {
      case 'PERCENT': return 'Giảm %';
      case 'FIXED': return 'Giảm tiền';
      case 'PRODUCT': return 'Tặng món';
      default: return type;
    }
  };

  // Filter promotions
  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          promo.ma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          promo.mo_ta?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || promo.loai_giam === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#c9975b] to-[#e8b97a] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-10 h-10" />
              <h1 className="text-4xl lg:text-5xl font-bold">Khuyến mãi</h1>
            </div>
            <p className="text-xl text-white/90">
              Khám phá các ưu đãi hấp dẫn dành riêng cho bạn
            </p>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-white shadow-sm sticky top-20 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm khuyến mãi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              />
            </div>
            
            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'ALL', label: 'Tất cả' },
                { value: 'PERCENT', label: 'Giảm %' },
                { value: 'FIXED', label: 'Giảm tiền' },
                { value: 'PRODUCT', label: 'Tặng món' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterType === option.value 
                      ? 'bg-[#c9975b] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Promotions List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block w-10 h-10 border-4 border-[#c9975b] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Đang tải khuyến mãi...</p>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Không có khuyến mãi nào</h3>
              <p className="text-gray-500">
                {searchTerm || filterType !== 'ALL' 
                  ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm' 
                  : 'Hiện tại chưa có chương trình khuyến mãi nào'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPromotions.map((promo) => (
                <div 
                  key={promo.id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition overflow-hidden group"
                >
                  {/* Header */}
                  <div className="relative bg-gradient-to-r from-[#c9975b] to-[#e8b97a] p-6 text-white">
                    {/* Discount Badge */}
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/20 rounded-full"></div>
                    <div className="absolute right-4 top-4">
                      <span className="text-3xl font-bold">{getDiscountText(promo)}</span>
                    </div>
                    
                    {/* Type Tag */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium mb-3">
                      {promo.loai_giam === 'PERCENT' && <Percent className="w-3 h-3" />}
                      {promo.loai_giam === 'FIXED' && <Tag className="w-3 h-3" />}
                      {promo.loai_giam === 'PRODUCT' && <Gift className="w-3 h-3" />}
                      {getTypeLabel(promo.loai_giam)}
                    </span>
                    
                    <h3 className="text-xl font-bold pr-16">{promo.ten}</h3>
                  </div>
                  
                  {/* Body */}
                  <div className="p-6">
                    {/* Promo Code */}
                    {promo.ma && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">Mã khuyến mãi:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg text-amber-700 font-mono font-bold text-center">
                            {promo.ma}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(promo.ma);
                              // Could add toast notification here
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Sao chép mã"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Description */}
                    {promo.mo_ta && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{promo.mo_ta}</p>
                    )}
                    
                    {/* Conditions */}
                    <div className="space-y-2 text-sm">
                      {promo.gia_tri_don_toi_thieu > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                          <span>Đơn tối thiểu: <strong>{promo.gia_tri_don_toi_thieu?.toLocaleString('vi-VN')}đ</strong></span>
                        </div>
                      )}
                      {promo.giam_toi_da > 0 && promo.loai_giam === 'PERCENT' && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span>Giảm tối đa: <strong>{promo.giam_toi_da?.toLocaleString('vi-VN')}đ</strong></span>
                        </div>
                      )}
                    </div>
                    
                    {/* Validity Period */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {formatDate(promo.ngay_bat_dau)} - {formatDate(promo.ngay_ket_thuc)}
                        </span>
                        {isExpiringSoon(promo.ngay_ket_thuc) && (
                          <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full animate-pulse">
                            Sắp hết hạn
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <Link
                      to="/customer/menu"
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c9975b] text-white font-medium rounded-lg hover:bg-[#d4a574] transition"
                    >
                      <span>Mua ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How to use section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Cách sử dụng mã khuyến mãi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#c9975b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#c9975b]">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Chọn món yêu thích</h3>
              <p className="text-gray-600 text-sm">Thêm các món bạn muốn vào giỏ hàng</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#c9975b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#c9975b]">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nhập mã khuyến mãi</h3>
              <p className="text-gray-600 text-sm">Nhập mã vào ô "Mã giảm giá" tại trang giỏ hàng</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#c9975b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#c9975b]">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Nhận ưu đãi</h3>
              <p className="text-gray-600 text-sm">Hoàn tất đặt hàng và tận hưởng ưu đãi</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
