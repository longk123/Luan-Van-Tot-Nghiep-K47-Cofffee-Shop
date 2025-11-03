// src/pages/PromotionManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import PromotionFormModal from '../components/manager/PromotionFormModal.jsx';
import PromotionDetailModal from '../components/manager/PromotionDetailModal.jsx';

export default function PromotionManagement() {
  const [promotions, setPromotions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [enableDateFilter, setEnableDateFilter] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateRangeError, setDateRangeError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [selectedPromotion, setSelectedPromotion] = useState(null);

  const loadData = useCallback(async () => {
    // Validate date range (chỉ validate, không block nếu không hợp lệ - để user có thể sửa)
    if (enableDateFilter && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      if (start > end) {
        setDateRangeError('Ngày kết thúc phải sau ngày bắt đầu');
        // KHÔNG return - vẫn load data nhưng không gửi date filter
      } else {
        setDateRangeError('');
      }
    } else {
      setDateRangeError(''); // Clear error nếu không có date filter
    }

    setLoading(true);
    try {
      // Kiểm tra date range hợp lệ để quyết định có gửi filter không
      const isValidDateRange = enableDateFilter && customStartDate && customEndDate && 
        new Date(customStartDate) <= new Date(customEndDate);
      
      const filterParams = {
        status: filterStatus !== 'ALL' ? filterStatus.toLowerCase() : undefined,
        type: filterType !== 'ALL' ? filterType : undefined,
        search: searchQuery || undefined,
        // Chỉ gửi date filter nếu enableDateFilter = true, có đủ cả 2 dates, và date range hợp lệ
        startDate: isValidDateRange ? customStartDate : undefined,
        endDate: isValidDateRange ? customEndDate : undefined
      };
      
      console.log('🔍 Loading promotions with filters:', filterParams);
      console.log('🔍 enableDateFilter:', enableDateFilter);
      console.log('🔍 customStartDate:', customStartDate);
      console.log('🔍 customEndDate:', customEndDate);
      console.log('🔍 isValidDateRange:', isValidDateRange);
      console.log('🔍 Will send startDate?', isValidDateRange ? customStartDate : 'NO');
      console.log('🔍 Will send endDate?', isValidDateRange ? customEndDate : 'NO');
      
      const [promotionsRes, summaryRes] = await Promise.all([
        api.getAllPromotions(filterParams),
        api.getPromotionSummary()
      ]);
      
      console.log('📦 Raw promotions response:', promotionsRes);
      console.log('📦 Raw summary response:', summaryRes);
      console.log('📦 promotionsRes?.data:', promotionsRes?.data);
      console.log('📦 Is promotionsRes array?', Array.isArray(promotionsRes));
      console.log('📦 promotionsRes type:', typeof promotionsRes);
      console.log('📦 promotionsRes keys:', promotionsRes ? Object.keys(promotionsRes) : 'null/undefined');
      
      // Handle different response formats: { success: true, data: [...] } or { data: [...] } or direct array
      const promotionsData = promotionsRes?.data || (Array.isArray(promotionsRes) ? promotionsRes : []);
      const summaryData = summaryRes?.data || summaryRes || {};
      
      console.log('✅ Parsed promotions:', promotionsData);
      console.log('✅ Parsed promotions count:', promotionsData?.length || 0);
      console.log('✅ Parsed summary:', summaryData);
      
      setPromotions(promotionsData);
      setSummary(summaryData);
      // Reset to page 1 when filters change
      setCurrentPage(1);
    } catch (error) {
      console.error('❌ Error loading promotions:', error);
      alert('Không thể tải dữ liệu khuyến mãi');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, searchQuery, enableDateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePromotion = () => {
    setEditingPromotion(null);
    setShowFormModal(true);
  };

  const handleEditPromotion = (promotion) => {
    setEditingPromotion(promotion);
    setShowFormModal(true);
  };

  const handleDeletePromotion = async (promotion) => {
    if (!confirm(`Bạn có chắc muốn xóa khuyến mãi "${promotion.ten}"?\n\nLưu ý: Lịch sử áp dụng sẽ vẫn được giữ lại.`)) {
      return;
    }

    try {
      await api.deletePromotion(promotion.id);
      alert('Xóa khuyến mãi thành công');
      loadData();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      alert(error.message || 'Không thể xóa khuyến mãi');
    }
  };

  const handleToggleActive = async (promotion) => {
    try {
      await api.togglePromotionActive(promotion.id, !promotion.active);
      alert(`${!promotion.active ? 'Kích hoạt' : 'Tắt'} khuyến mãi thành công`);
      loadData();
    } catch (error) {
      console.error('Error toggling promotion:', error);
      alert('Không thể thay đổi trạng thái');
    }
  };

  const handleViewPromotion = (promotion) => {
    setSelectedPromotion(promotion);
    setShowDetailModal(true);
  };

  const handleFormSuccess = async () => {
    setShowFormModal(false);
    setEditingPromotion(null);
    // Reload data after successful create/update
    await loadData();
  };

  // Filter and search
  const filteredPromotions = promotions.filter(promo => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        promo.ma?.toLowerCase().includes(query) ||
        promo.ten?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter is already applied in API call
    // Type filter is already applied in API call

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);
  const paginatedPromotions = filteredPromotions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (promo) => {
    const now = new Date();
    const start = promo.bat_dau ? new Date(promo.bat_dau) : null;
    const end = promo.ket_thuc ? new Date(promo.ket_thuc) : null;

    if (!promo.active || (end && now > end)) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Không hoạt động</span>;
    }
    if (start && now < start) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Sắp diễn ra</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đang hoạt động</span>;
  };

  const getTypeBadge = (type) => {
    if (type === 'PERCENT') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Phần trăm</span>;
    }
    // Support both AMOUNT and FIXED (legacy)
    if (type === 'AMOUNT' || type === 'FIXED') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Số tiền</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{type}</span>;
  };

  const formatValue = (promo) => {
    if (promo.loai === 'PERCENT') {
      return `${promo.gia_tri}%${promo.max_giam ? ` (tối đa ${formatCurrency(promo.max_giam)})` : ''}`;
    }
    // Support both AMOUNT and FIXED (legacy)
    if (promo.loai === 'AMOUNT' || promo.loai === 'FIXED') {
      return formatCurrency(promo.gia_tri);
    }
    return formatCurrency(promo.gia_tri);
  };

  return (
    <AuthedLayout>
      <div className="pb-32">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#d4a574] to-[#c9975b] rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Khuyến mãi</h1>
                <p className="text-sm text-gray-500 mt-0.5">{filteredPromotions.length} chương trình</p>
              </div>
            </div>
            <button
              onClick={handleCreatePromotion}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm khuyến mãi</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-green-500 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Đang hoạt động</div>
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-green-600">{summary.total_active || 0}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-blue-500 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Đã dùng hôm nay</div>
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-blue-600">{summary.total_used_today || 0}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-orange-500 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Giảm giá hôm nay</div>
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.total_discount_today || 0)}</div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border-l-4 border-red-500 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Sắp hết hạn (7 ngày)</div>
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-red-600">{summary.expiring_soon || 0}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {/* First row: Search and basic filters */}
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo mã, tên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                  }}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Không hoạt động</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                  }}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                >
                  <option value="ALL">Tất cả loại</option>
                  <option value="PERCENT">Phần trăm</option>
                  <option value="AMOUNT">Số tiền</option>
                </select>
              </div>

              {/* Refresh button - Clear all filters */}
              <button
                onClick={() => {
                  // Clear all filters - loadData will be called automatically via useEffect when filters change
                  setSearchQuery('');
                  setFilterStatus('ALL');
                  setFilterType('ALL');
                  setEnableDateFilter(false);
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setDateRangeError('');
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-white hover:text-[#c9975b] hover:border-2 hover:border-[#c9975b] transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Làm mới</span>
              </button>
            </div>

            {/* Second row: Custom date range */}
            <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-gray-200">
              <button
                onClick={() => {
                  if (!enableDateFilter) {
                    // Khi bật filter, set ngày mặc định
                    const endDate = new Date().toISOString().split('T')[0];
                    const startDate = new Date();
                    startDate.setDate(startDate.getDate() - 30);
                    setCustomStartDate(startDate.toISOString().split('T')[0]);
                    setCustomEndDate(endDate);
                  } else {
                    // Khi tắt filter, xóa date và reload
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                  setEnableDateFilter(!enableDateFilter);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  enableDateFilter
                    ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-[#f5ebe0] hover:text-[#c9975b] border-2 border-transparent hover:border-[#c9975b]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Tùy chỉnh thời gian
              </button>

              {/* Date range inputs - chỉ hiển thị khi enableDateFilter = true */}
              {enableDateFilter && (
                <>
                  <div className="flex gap-3 items-center">
                    <label className="text-sm text-gray-600">Từ:</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setDateRangeError(''); // Clear error when user changes date
                        // Auto-reload khi date thay đổi (sau một chút để tránh reload quá nhiều)
                        if (e.target.value && customEndDate) {
                          setTimeout(() => loadData(), 300);
                        }
                      }}
                      className={`px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                        dateRangeError ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    <label className="text-sm text-gray-600">Đến:</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setDateRangeError(''); // Clear error when user changes date
                        // Auto-reload khi date thay đổi (sau một chút để tránh reload quá nhiều)
                        if (customStartDate && e.target.value) {
                          setTimeout(() => loadData(), 300);
                        }
                      }}
                      min={customStartDate || undefined}
                      className={`px-3 py-2 border-2 rounded-lg text-sm focus:ring-2 focus:ring-[#c9975b] focus:border-transparent ${
                        dateRangeError ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                  </div>

                  {/* Error message */}
                  {dateRangeError && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {dateRangeError}
                    </div>
                  )}

                  {/* Date range badge */}
                  {customStartDate && customEndDate && !dateRangeError && (
                    <div className="ml-auto">
                      <span className="px-3 py-1.5 bg-[#f5ebe0] text-[#c9975b] rounded-full text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {customStartDate} - {customEndDate}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Promotions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã KM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên chương trình</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá trị</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đã dùng</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c9975b] border-t-transparent"></div>
                        <span>Đang tải...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedPromotions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <div className="text-lg font-medium mb-2">Không có khuyến mãi nào</div>
                        <div className="text-sm">Thử thay đổi bộ lọc hoặc thêm khuyến mãi mới</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPromotions.map((promo) => (
                    <tr key={promo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {promo.ma || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {promo.ten}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getTypeBadge(promo.loai)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatValue(promo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(promo)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {promo.bat_dau ? (
                          <>
                            <div>Từ {formatDateTime(promo.bat_dau)}</div>
                            {promo.ket_thuc ? (
                              <div className="text-xs text-gray-400">Đến {formatDateTime(promo.ket_thuc)}</div>
                            ) : (
                              <div className="text-xs text-gray-400">Vô thời hạn</div>
                            )}
                          </>
                        ) : promo.ket_thuc ? (
                          <>
                            <div>Đến {formatDateTime(promo.ket_thuc)}</div>
                          </>
                        ) : (
                          <div>Luôn có hiệu lực</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {promo.used_count || 0}{promo.usage_limit ? `/${promo.usage_limit}` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewPromotion(promo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Xem chi tiết"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditPromotion(promo)}
                            className="p-2 text-[#c9975b] hover:bg-[#f5ebe0] rounded-lg transition-all duration-200"
                            title="Sửa"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleActive(promo)}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              promo.active 
                                ? "text-yellow-600 hover:bg-yellow-50" 
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={promo.active ? "Tắt" : "Kích hoạt"}
                          >
                            {promo.active ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeletePromotion(promo)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Xóa"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600 font-medium">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPromotions.length)} / {filteredPromotions.length} khuyến mãi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-[#c9975b] hover:text-[#c9975b] transition-all duration-200 font-medium"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 border-2 rounded-lg font-medium transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-[#c9975b] shadow-md'
                        : 'border-gray-300 hover:bg-white hover:border-[#c9975b] hover:text-[#c9975b]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-[#c9975b] hover:text-[#c9975b] transition-all duration-200 font-medium"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Modal */}
        {showFormModal && (
          <PromotionFormModal
            promotion={editingPromotion}
            onClose={() => {
              setShowFormModal(false);
              setEditingPromotion(null);
            }}
            onSuccess={handleFormSuccess}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedPromotion && (
          <PromotionDetailModal
            promotion={selectedPromotion}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedPromotion(null);
            }}
            onEdit={() => {
              setShowDetailModal(false);
              handleEditPromotion(selectedPromotion);
            }}
            onDelete={() => {
              setShowDetailModal(false);
              handleDeletePromotion(selectedPromotion);
            }}
          />
        )}
      </div>
    </AuthedLayout>
  );
}
