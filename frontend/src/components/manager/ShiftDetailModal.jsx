// src/components/manager/ShiftDetailModal.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function ShiftDetailModal({ shift, onClose }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('summary'); // summary, payments, orders

  useEffect(() => {
    loadShiftReport();
  }, [shift.id]);

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
            {[
              { id: 'summary', name: 'Tổng quan', icon: '📊' },
              { id: 'payments', name: 'Thanh toán', icon: '💰' },
              { id: 'orders', name: 'Đơn hàng', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                  activeTab === tab.id
                    ? 'border-[#c9975b] text-[#c9975b]'
                    : 'border-transparent text-gray-600 hover:text-[#c9975b]'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
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

              {/* Thống kê đơn hàng */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Thống kê đơn hàng</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Tổng đơn</div>
                    <div className="text-2xl font-bold text-blue-600">{report.total_orders || 0}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Doanh thu gộp</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(report.gross_amount)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Giảm giá</div>
                    <div className="text-lg font-bold text-orange-600">-{formatCurrency(report.discount_amount)}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm text-gray-600">Doanh thu thuần</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(report.net_amount)}</div>
                  </div>
                </div>
              </div>

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
              <h3 className="font-semibold text-gray-900 mb-3">Chi tiết thanh toán</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💵</span>
                    <div className="text-sm text-gray-600">Tiền mặt</div>
                  </div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(report.cash_amount)}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💳</span>
                    <div className="text-sm text-gray-600">Thẻ</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">{formatCurrency(report.card_amount)}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📱</span>
                    <div className="text-sm text-gray-600">Online</div>
                  </div>
                  <div className="text-2xl font-bold text-purple-700">{formatCurrency(report.online_amount)}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Danh sách đơn hàng</h3>
              <div className="text-gray-600 text-sm">
                Tổng {report.total_orders || 0} đơn hàng trong ca này
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                <p>Chi tiết đơn hàng sẽ được hiển thị ở đây</p>
                <p className="text-sm mt-2">(Tính năng đang phát triển)</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white rounded-lg hover:shadow-lg transition-all"
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

