// src/components/manager/ShiftDetailModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function ShiftDetailModal({ shift, onClose }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // summary, payments, orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    loadShiftReport();
  }, [shift.id]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, shift.id]);

  const loadShiftReport = async () => {
    setLoading(true);
    try {
      const res = await api.getShiftReport(shift.id);
      setReport(res?.data || res);
    } catch (error) {
      console.error('Error loading shift report:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.getShiftOrders(shift.id);
      setOrders(res?.data || res || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return '-';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#c9975b] border-t-transparent"></div>
            <span className="text-gray-700">Đang tải báo cáo...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Báo cáo ca làm việc #{shift.id}</h2>
            <p className="text-sm opacity-90 mt-1">
              {report.nhan_vien_ten} • {report.shift_type === 'CASHIER' ? 'Thu ngân' : 'Bếp'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            {/* Tab Tổng quan */}
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 flex items-center gap-2 ${
                activeTab === 'summary'
                  ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-[#c9975b] rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:bg-[#f5ebe0] hover:text-[#c9975b] rounded-t-lg'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Tổng quan
            </button>
            
            {/* Tab Thanh toán (chỉ cho CASHIER) */}
            {report.shift_type === 'CASHIER' && (
              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 flex items-center gap-2 ${
                  activeTab === 'payments'
                    ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-[#c9975b] rounded-t-lg'
                    : 'border-transparent text-gray-600 hover:bg-[#f5ebe0] hover:text-[#c9975b] rounded-t-lg'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Thanh toán
              </button>
            )}

            {/* Tab Đơn hàng / Món đã làm */}
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-[#c9975b] rounded-t-lg'
                  : 'border-transparent text-gray-600 hover:bg-[#f5ebe0] hover:text-[#c9975b] rounded-t-lg'
              }`}
            >
              {report.shift_type === 'KITCHEN' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              )}
              {report.shift_type === 'KITCHEN' ? 'Món đã làm' : 'Đơn hàng'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Thông tin ca */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Thông tin ca</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Bắt đầu</div>
                    <div className="font-medium text-gray-900">{formatDateTime(report.started_at)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Kết thúc</div>
                    <div className="font-medium text-gray-900">{formatDateTime(report.closed_at)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Thời gian</div>
                    <div className="font-medium text-gray-900">{formatDuration(report.started_at, report.closed_at)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Trạng thái</div>
                    <div className="font-medium text-gray-900">
                      {report.status === 'OPEN' ? (
                        <span className="text-green-600">Đang mở</span>
                      ) : (
                        <span className="text-gray-600">Đã đóng</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thống kê đơn hàng / Kitchen stats */}
              {report.shift_type === 'CASHIER' ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Thống kê đơn hàng</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Đơn đã thanh toán</div>
                      <div className="text-2xl font-bold text-blue-600">{report.total_orders || 0}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Tổng tạm tính</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(report.gross_amount)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Tổng giảm giá</div>
                      <div className="text-lg font-bold text-orange-600">-{formatCurrency(report.discount_amount)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Doanh thu</div>
                      <div className="text-lg font-bold text-green-600">{formatCurrency(report.net_amount)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4 border-2 border-primary-200">
                  <h3 className="font-semibold text-primary-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Hiệu suất pha chế
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <div className="text-sm text-dark-600 mb-1">Món đã làm</div>
                      <div className="text-2xl font-bold text-primary-900">{shift.stats?.total_items_made || report.kitchenStats?.total_items_made || 0}</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <div className="text-sm text-dark-600 mb-1">Món bị hủy</div>
                      <div className="text-2xl font-bold text-red-600">{shift.stats?.total_items_cancelled || report.kitchenStats?.total_items_cancelled || 0}</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 border border-primary-200">
                      <div className="text-sm text-dark-600 mb-1">Thời gian TB/món</div>
                      <div className="text-2xl font-bold text-primary-700">
                        {shift.stats?.avg_prep_time_seconds || report.kitchenStats?.avg_prep_time_seconds
                          ? `${Math.round((shift.stats?.avg_prep_time_seconds || report.kitchenStats?.avg_prep_time_seconds) / 60)}m`
                          : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiền mặt (chỉ cho ca CASHIER) */}
              {report.shift_type === 'CASHIER' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Quản lý tiền mặt</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Tiền đầu ca</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(report.opening_cash)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Thu tiền mặt</div>
                      <div className="text-lg font-bold text-blue-600">{formatCurrency(report.cash_amount)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Tổng phải có</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(report.expected_cash)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Thực tế</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(report.actual_cash)}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-sm text-gray-600">Chênh lệch</div>
                      <div className={`text-lg font-bold ${
                        (report.cash_diff || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(report.cash_diff)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              {report.note && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Ghi chú</h3>
                  <p className="text-gray-700">{report.note}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Phân loại thanh toán
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                  <span className="text-dark-700 font-medium">💵 Tiền mặt</span>
                  <span className="font-bold text-dark-900">{formatCurrency(report.cash_amount)}</span>
                </div>
                
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                  <span className="text-dark-700 font-medium">💳 Thẻ</span>
                  <span className="font-bold text-dark-900">{formatCurrency(report.card_amount)}</span>
                </div>
                
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                  <span className="text-dark-700 font-medium">🏦 Chuyển khoản</span>
                  <span className="font-bold text-dark-900">{formatCurrency(report.transfer_amount || 0)}</span>
                </div>
                
                <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-200">
                  <span className="text-dark-700 font-medium">📱 Online (PayOS)</span>
                  <span className="font-bold text-dark-900">{formatCurrency(report.online_amount)}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  {report.shift_type === 'KITCHEN' ? 'Danh sách món đã làm' : 'Danh sách đơn hàng'}
                </h3>
                <div className="text-sm text-gray-600">
                  Tổng: <span className="font-semibold text-blue-600">{orders.length}</span> {report.shift_type === 'KITCHEN' ? 'món' : 'đơn'}
                </div>
              </div>

              {ordersLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9975b]"></div>
                  <p className="text-gray-500 mt-2">Đang tải...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                  {report.shift_type === 'KITCHEN' ? (
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  ) : (
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  )}
                  <p className="text-base">{report.shift_type === 'KITCHEN' ? 'Chưa làm món nào trong ca này' : 'Chưa có đơn hàng nào trong ca này'}</p>
                </div>
              ) : report.shift_type === 'KITCHEN' ? (
                // Kitchen: Hiển thị danh sách món đã làm
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Món</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Biến thể</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SL</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Đơn hàng</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bàn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TG làm</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hoàn thành</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.mon_ten}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.bien_the_ten || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{item.so_luong}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="text-blue-600 font-medium">#{item.don_hang_id}</span>
                            {item.order_type === 'DINE_IN' ? (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Tại bàn</span>
                            ) : (
                              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Mang đi</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.ten_ban || '-'}
                            {item.khu_vuc_ten && <span className="text-xs text-gray-400 ml-1">({item.khu_vuc_ten})</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{item.ghi_chu || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            {item.prep_time_seconds ? (
                              <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded text-xs font-medium">
                                {Math.floor(item.prep_time_seconds / 60)}m {item.prep_time_seconds % 60}s
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.finished_at
                              ? new Date(item.finished_at).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })
                              : '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Cashier: Hiển thị danh sách đơn hàng
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã đơn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bàn</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nhân viên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số món</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">#{order.id}</td>
                          <td className="px-4 py-3 text-sm">
                            {order.order_type === 'DINE_IN' ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Tại bàn</span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Mang đi</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.ten_ban || '-'}
                            {order.khu_vuc_ten && <span className="text-xs text-gray-400 ml-1">({order.khu_vuc_ten})</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.nhan_vien_ten || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{order.so_mon || 0}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(order.tong_tien)}</td>
                          <td className="px-4 py-3 text-sm">
                            {order.trang_thai === 'PAID' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Đã thanh toán</span>
                            ) : order.trang_thai === 'CANCELLED' ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Đã hủy</span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Chưa thanh toán</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.closed_at
                              ? new Date(order.closed_at).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })
                              : new Date(order.opened_at).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit'
                                })
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-300 hover:text-white hover:border-gray-300 transition-all duration-200 font-semibold"
          >
            Đóng
          </button>
          <button
            onClick={() => window.open(`/shift-report-print?shiftId=${shift.id}`, '_blank')}
            className="px-4 py-2 bg-green-600 text-white border-2 border-green-600 rounded-lg hover:bg-white hover:text-green-600 transition-all duration-200 font-semibold"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              In báo cáo
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

