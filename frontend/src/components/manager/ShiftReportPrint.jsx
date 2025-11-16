// src/components/manager/ShiftReportPrint.jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';

export default function ShiftReportPrint() {
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get('shiftId');
  const [report, setReport] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shiftId) {
      loadData();
    }
  }, [shiftId]);

  const loadData = async () => {
    try {
      const [reportRes, ordersRes] = await Promise.all([
        api.getShiftReport(shiftId),
        api.getShiftOrders(shiftId)
      ]);
      setReport(reportRes?.data || reportRes);
      setOrders(ordersRes?.data || ordersRes || []);
      
      // Auto print after data loaded
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      console.error('Error loading report:', error);
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
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9975b] mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Không tìm thấy báo cáo</p>
      </div>
    );
  }

  const isKitchen = report.shift_type === 'KITCHEN';

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          @page { margin: 1cm; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">DEVCOFFEE</h1>
        <p className="text-sm text-gray-600 mt-1">Địa chỉ: 123 Đường ABC, Quận XYZ, TP.HCM</p>
        <p className="text-sm text-gray-600">Điện thoại: 0123 456 789</p>
        <h2 className="text-xl font-bold text-[#c9975b] mt-4">BÁO CÁO CA LÀM VIỆC</h2>
        <p className="text-sm text-gray-600 mt-1">Mã ca: #{report.shift_id}</p>
      </div>

      {/* Thông tin ca */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">THÔNG TIN CA</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nhân viên:</p>
            <p className="font-semibold">{report.nhan_vien_ten}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Loại ca:</p>
            <p className="font-semibold">{isKitchen ? 'Pha chế / Bếp' : 'Thu ngân'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Bắt đầu:</p>
            <p className="font-semibold">{formatDateTime(report.started_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Kết thúc:</p>
            <p className="font-semibold">{formatDateTime(report.closed_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Trạng thái:</p>
            <p className="font-semibold">{report.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}</p>
          </div>
        </div>
      </div>

      {/* Thống kê - CASHIER */}
      {!isKitchen && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">THỐNG KÊ ĐƠN HÀNG</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Đơn đã thanh toán</p>
                <p className="text-2xl font-bold text-blue-600">{report.total_orders || 0}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Tổng tạm tính</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(report.gross_amount)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Tổng giảm giá</p>
                <p className="text-lg font-bold text-orange-600">-{formatCurrency(report.discount_amount)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Doanh thu</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(report.net_amount)}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">QUẢN LÝ TIỀN MẶT</h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Tiền đầu ca</p>
                <p className="text-lg font-bold">{formatCurrency(report.opening_cash)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Thu tiền mặt</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(report.cash_amount)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Tổng phải có</p>
                <p className="text-lg font-bold">{formatCurrency(report.expected_cash)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Tiền thực tế</p>
                <p className="text-lg font-bold">{formatCurrency(report.actual_cash)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">Chênh lệch</p>
                <p className={`text-lg font-bold ${report.cash_diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.cash_diff)}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">PHƯƠNG THỨC THANH TOÁN</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">💵 Tiền mặt</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(report.cash_amount)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">💳 Thẻ</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(report.card_amount)}</p>
              </div>
              <div className="border border-gray-300 rounded p-3 text-center">
                <p className="text-sm text-gray-600">📱 Online</p>
                <p className="text-xl font-bold text-purple-700">{formatCurrency(report.online_amount)}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Thống kê - KITCHEN */}
      {isKitchen && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">HIỆU SUẤT PHA CHẾ</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-300 rounded p-4 text-center">
              <p className="text-sm text-gray-600">Món đã làm</p>
              <p className="text-4xl font-bold text-blue-600">{report.kitchenStats?.total_items_made || 0}</p>
            </div>
            <div className="border border-gray-300 rounded p-4 text-center">
              <p className="text-sm text-gray-600">Món bị hủy</p>
              <p className="text-4xl font-bold text-red-600">{report.kitchenStats?.total_items_cancelled || 0}</p>
            </div>
            <div className="border border-gray-300 rounded p-4 text-center">
              <p className="text-sm text-gray-600">Thời gian TB/món</p>
              <p className="text-4xl font-bold text-cyan-600">
                {report.kitchenStats?.avg_prep_time_seconds 
                  ? `${Math.round(report.kitchenStats.avg_prep_time_seconds / 60)}m` 
                  : '--'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Danh sách đơn hàng / món đã làm */}
      {orders.length > 0 && (
        <div className="mb-6 page-break">
          <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            {isKitchen ? 'DANH SÁCH MÓN ĐÃ LÀM' : 'DANH SÁCH ĐƠN HÀNG'}
          </h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              {isKitchen ? (
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-left">Món</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">SL</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Đơn hàng</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Bàn</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">TG làm</th>
                </tr>
              ) : (
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-left">Mã đơn</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Loại</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Bàn</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Số món</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">Tổng tiền</th>
                  <th className="border border-gray-300 px-2 py-2 text-center">Trạng thái</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isKitchen ? (
                orders.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 px-2 py-2">
                      {item.mon_ten} {item.bien_the_ten && `(${item.bien_the_ten})`}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">{item.so_luong}</td>
                    <td className="border border-gray-300 px-2 py-2">#{item.don_hang_id}</td>
                    <td className="border border-gray-300 px-2 py-2">{item.ten_ban || 'Mang đi'}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {item.prep_time_seconds ? `${Math.floor(item.prep_time_seconds / 60)}m ${item.prep_time_seconds % 60}s` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                orders.map((order, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-300 px-2 py-2">#{order.id}</td>
                    <td className="border border-gray-300 px-2 py-2">
                      {order.order_type === 'DINE_IN' ? 'Tại bàn' : 'Mang đi'}
                    </td>
                    <td className="border border-gray-300 px-2 py-2">{order.ten_ban || '-'}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">{order.so_mon || 0}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right font-semibold">{formatCurrency(order.tong_tien)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {order.trang_thai === 'PAID' ? 'Đã TT' : order.trang_thai === 'CANCELLED' ? 'Đã hủy' : 'Chưa TT'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ghi chú */}
      {report.note && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">GHI CHÚ</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.note}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-12">Nhân viên</p>
            <p className="font-semibold border-t border-gray-400 pt-1 inline-block px-8">{report.nhan_vien_ten}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-12">Quản lý</p>
            <p className="font-semibold border-t border-gray-400 pt-1 inline-block px-8">........................</p>
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">
          In lúc: {new Date().toLocaleString('vi-VN')}
        </p>
      </div>
    </div>
  );
}

