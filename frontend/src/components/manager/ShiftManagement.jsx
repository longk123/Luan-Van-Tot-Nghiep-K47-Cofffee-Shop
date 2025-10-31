// src/components/manager/ShiftManagement.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';
import ShiftDetailModal from './ShiftDetailModal.jsx';

export default function ShiftManagement({ timeRange, customStartDate, customEndDate }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterType, setFilterType] = useState('CASHIER'); // CASHIER, KITCHEN (no ALL option)
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, OPEN, CLOSED

  useEffect(() => {
    loadShifts();
  }, [timeRange, customStartDate, customEndDate]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      // Luôn lấy ca trong 30 ngày gần đây (không phụ thuộc timeRange)
      // Vì ca làm việc thường không nhiều, và user muốn xem tất cả ca
      const days = 30;

      const res = await api.getShiftStats(days);
      setShifts(res?.data || res || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (shift) => {
    setSelectedShift(shift);
    setShowDetailModal(true);
  };

  // Filter shifts - NO "ALL" option for type
  const filteredShifts = shifts.filter(shift => {
    if (shift.type !== filterType) return false; // Always filter by type
    if (filterStatus !== 'ALL' && shift.status !== filterStatus) return false;
    return true;
  });

  // Tính tổng thống kê - CHỈ TÍNH CA CASHIER
  const totalStats = filteredShifts
    .filter(shift => shift.type === 'CASHIER')
    .reduce((acc, shift) => ({
      total_orders: acc.total_orders + (shift.stats?.total_orders || 0),
      gross_amount: acc.gross_amount + (shift.stats?.gross_amount || 0),
      net_amount: acc.net_amount + (shift.stats?.net_amount || 0),
      cash_diff: acc.cash_diff + (shift.stats?.cash_diff || 0),
    }), { total_orders: 0, gross_amount: 0, net_amount: 0, cash_diff: 0 });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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

  const getStatusBadge = (status) => {
    if (status === 'OPEN') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đang mở</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Đã đóng</span>;
  };

  const getTypeBadge = (type) => {
    if (type === 'CASHIER') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Thu ngân</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Pha chế</span>;
  };

  return (
    <div className="pb-32">
      {/* Summary Cards - Different for CASHIER vs KITCHEN */}
      {filterType === 'CASHIER' ? (
        // CASHIER: Show orders, revenue, cash difference
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Tổng ca</div>
            <div className="text-2xl font-bold text-gray-900">{filteredShifts.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Tổng đơn</div>
            <div className="text-2xl font-bold text-blue-600">{totalStats.total_orders}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Doanh thu</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.net_amount)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Chênh lệch tiền mặt</div>
            <div className={`text-2xl font-bold ${totalStats.cash_diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalStats.cash_diff)}
            </div>
          </div>
        </div>
      ) : (
        // KITCHEN: Show only total shifts (no revenue/cash stats)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Tổng ca</div>
            <div className="text-2xl font-bold text-gray-900">{filteredShifts.length}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg shadow border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">💡 Lưu ý</div>
            <div className="text-sm text-gray-700">Ca Pha chế không quản lý tiền mặt và đơn hàng</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại ca</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
            >
              <option value="CASHIER">Thu ngân</option>
              <option value="KITCHEN">Pha chế</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="OPEN">Đang mở</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bắt đầu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kết thúc</th>
                {filterType === 'CASHIER' && (
                  <>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn hàng</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chênh lệch</th>
                  </>
                )}
                {filterType === 'KITCHEN' && (
                  <>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Món đã làm</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">TG trung bình</th>
                  </>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c9975b] border-t-transparent"></div>
                      <span>Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="text-lg font-medium mb-2">Không có ca làm việc nào</div>
                      <div className="text-sm">
                        {shifts.length === 0 ? (
                          <>Chưa có ca làm việc nào trong 30 ngày gần đây. Hãy mở ca mới từ Dashboard.</>
                        ) : (
                          <>Không có ca nào phù hợp với bộ lọc hiện tại. Thử thay đổi bộ lọc.</>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{shift.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof shift.staff === 'string' ? shift.staff : (shift.staff?.full_name || shift.staff?.username || '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(shift.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(shift.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(shift.closed_at)}
                    </td>
                    {filterType === 'CASHIER' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {shift.stats?.total_orders || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                          {formatCurrency(shift.stats?.net_amount || 0)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          (shift.stats?.cash_diff || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(shift.stats?.cash_diff || 0)}
                        </td>
                      </>
                    )}
                    {filterType === 'KITCHEN' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {shift.stats?.total_items_made || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {shift.stats?.avg_prep_time_seconds ? `${Math.round(shift.stats.avg_prep_time_seconds / 60)}m` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button
                        onClick={() => handleViewDetail(shift)}
                        className="text-[#c9975b] hover:text-[#b8864a] font-medium"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedShift(null);
          }}
        />
      )}
    </div>
  );
}

