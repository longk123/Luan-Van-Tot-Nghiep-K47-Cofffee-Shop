// src/components/manager/PromotionDetailModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function PromotionDetailModal({ promotion, onClose, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState('info');
  const [stats, setStats] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promotion?.id) {
      console.warn('⚠️ Promotion ID not available');
      return;
    }
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'history') {
      console.log('🔍 useEffect: Loading history for promotion:', promotion.id);
      loadUsageHistory();
    }
  }, [activeTab, promotion?.id]);

  const loadStats = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading stats for promotion:', promotion.id);
      const response = await api.getPromotionStats(promotion.id);
      console.log('📦 Stats response:', response);
      console.log('📦 Stats data:', response.data);
      setStats(response.data || {});
    } catch (error) {
      console.error('❌ Error loading stats:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      alert('Không thể tải thống kê: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const loadUsageHistory = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading usage history for promotion:', promotion.id);
      const response = await api.getPromotionUsage(promotion.id, { limit: 50 });
      console.log('📦 Usage history response:', response);
      console.log('📦 Response data:', response.data);
      console.log('📦 Response data type:', typeof response.data);
      console.log('📦 Is Array?:', Array.isArray(response.data));
      
      // Backend returns {success: true, data: [...]}
      // The data is directly an array, not nested
      const historyData = Array.isArray(response?.data) 
        ? response.data 
        : (response?.data?.data || []);
      
      console.log('✅ Parsed history data:', historyData);
      console.log('✅ History count:', historyData.length);
      
      if (historyData.length > 0) {
        console.log('✅ First item:', historyData[0]);
        console.log('✅ First item tong_tien:', historyData[0].tong_tien, typeof historyData[0].tong_tien);
        console.log('✅ First item giam_gia:', historyData[0].giam_gia, typeof historyData[0].giam_gia);
        console.log('✅ First item thanh_toan:', historyData[0].thanh_toan, typeof historyData[0].thanh_toan);
      }
      
      setUsageHistory(historyData);
    } catch (error) {
      console.error('❌ Error loading usage history:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      alert('Không thể tải lịch sử sử dụng: ' + (error.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0 ₫';
    }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) {
      return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numAmount);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    const now = new Date();
    const start = promotion.bat_dau ? new Date(promotion.bat_dau) : null;
    const end = promotion.ket_thuc ? new Date(promotion.ket_thuc) : null;

    if (!promotion.active || (end && now > end)) {
      return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-800">Không hoạt động</span>;
    }
    if (start && now < start) {
      return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">Sắp diễn ra</span>;
    }
    return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">Đang hoạt động</span>;
  };

  const renderInfoTab = () => (
    <div className="space-y-6">
      {/* Status and Actions */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
          {getStatusBadge()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-[#c9975b] text-white rounded-lg hover:bg-[#b8864a] transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Sửa
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Xóa
          </button>
        </div>
      </div>

      {/* Promotion Details */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Mã khuyến mãi</label>
          <div className="text-lg font-semibold text-gray-900">{promotion.ma || '-'}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Tên chương trình</label>
          <div className="text-lg font-semibold text-gray-900">{promotion.ten}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Loại khuyến mãi</label>
          <div className="text-base text-gray-900">
            {promotion.loai === 'PERCENT' ? (
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Phần trăm</span>
                <span>{promotion.gia_tri}%</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Số tiền</span>
                <span>{formatCurrency(promotion.gia_tri)}</span>
              </span>
            )}
          </div>
        </div>

        {promotion.loai === 'PERCENT' && promotion.max_giam && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Giảm tối đa</label>
            <div className="text-base text-gray-900">{formatCurrency(promotion.max_giam)}</div>
          </div>
        )}

        {promotion.dieu_kien && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Đơn tối thiểu</label>
            <div className="text-base text-gray-900">{formatCurrency(promotion.dieu_kien)}</div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Thời gian bắt đầu</label>
          <div className="text-base text-gray-900">
            {promotion.bat_dau ? formatDateTime(promotion.bat_dau) : 'Ngay lập tức'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Thời gian kết thúc</label>
          <div className="text-base text-gray-900">
            {promotion.ket_thuc ? formatDateTime(promotion.ket_thuc) : 'Không giới hạn'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Số lần sử dụng</label>
          <div className="text-base text-gray-900">
            {promotion.used_count || 0}
            {promotion.usage_limit ? ` / ${promotion.usage_limit}` : ' (Không giới hạn)'}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Áp dụng cùng KM khác</label>
          <div className="text-base text-gray-900">
            {promotion.stackable ? (
              <span className="text-green-600 font-medium">✓ Có</span>
            ) : (
              <span className="text-gray-600">✗ Không</span>
            )}
          </div>
        </div>

        {promotion.mo_ta && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-500 mb-1">Mô tả</label>
            <div className="text-base text-gray-900 bg-gray-50 p-4 rounded-lg">{promotion.mo_ta}</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9975b] border-t-transparent"></div>
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium mb-1">Tổng lượt dùng</div>
              <div className="text-2xl font-bold text-blue-700">{stats.total_usage || 0}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium mb-1">Tổng giảm giá</div>
              <div className="text-2xl font-bold text-green-700">{formatCurrency(stats.total_discount || 0)}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-orange-600 font-medium mb-1">Trung bình/lần</div>
              <div className="text-2xl font-bold text-orange-700">{formatCurrency(stats.avg_discount || 0)}</div>
            </div>
          </div>

          {/* Usage by Period */}
          {stats.usage_by_period && stats.usage_by_period.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lượt dùng theo thời gian</h3>
              <div className="space-y-2">
                {stats.usage_by_period.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">{item.period}</div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-900">{item.count} lần</span>
                      <span className="text-sm text-green-600">{formatCurrency(item.total_discount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Users */}
          {stats.top_users && stats.top_users.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thu ngân áp dụng nhiều nhất</h3>
              <div className="space-y-2">
                {stats.top_users.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#c9975b] text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="text-sm text-gray-700">{user.username || 'Khách'}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-gray-900">{user.count} lần</span>
                      <span className="text-sm text-green-600">{formatCurrency(user.total_discount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 py-12">
          Không có dữ liệu thống kê
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9975b] border-t-transparent"></div>
        </div>
      ) : usageHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã đơn</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá trị đơn</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giảm giá</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thanh toán</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thu ngân</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageHistory.map((item, index) => {
                console.log('📋 History item:', index, item);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.ngay_tao ? formatDateTime(item.ngay_tao) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                      #{item.don_hang_id || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(item.tong_tien)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      -{formatCurrency(item.giam_gia)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(item.thanh_toan)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {item.username || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          Chưa có lịch sử sử dụng
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#d4a574] to-[#c9975b]">
          <div>
            <h2 className="text-xl font-bold text-white">{promotion.ten}</h2>
            <p className="text-sm text-white/80 mt-1">{promotion.ma || 'Không có mã'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'info'
                  ? 'text-[#c9975b] border-b-2 border-[#c9975b]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Thông tin
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'text-[#c9975b] border-b-2 border-[#c9975b]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Thống kê
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-[#c9975b] border-b-2 border-[#c9975b]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Lịch sử
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && renderInfoTab()}
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
