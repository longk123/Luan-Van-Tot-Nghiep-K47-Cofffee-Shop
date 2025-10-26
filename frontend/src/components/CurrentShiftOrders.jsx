// src/components/CurrentShiftOrders.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { getUser } from '../auth.js';
import useSSE from '../hooks/useSSE.js';

export default function CurrentShiftOrders() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCurrentShiftOrders();
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Auto-refresh when orders are updated/closed (payment completed)
  useSSE('/api/v1/pos/events', (evt) => {
    if (['order.updated', 'order.closed', 'order.cancelled', 'order.items.changed'].includes(evt.type)) {
      console.log('🔄 CurrentShiftOrders: SSE event received, refreshing...', evt.type);
      fetchOrders();
    }
  }, []);

  const formatCurrency = (amount) => {
    const safeAmount = amount ?? 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(safeAmount);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const handleViewInvoice = async (order) => {
    try {
      setSelectedOrder(order);
      setInvoiceLoading(true);
      setInvoiceData(null);
      
      const response = await api.getInvoiceData(order.id);
      console.log('🔍 Invoice data received:', response.data);
      console.log('🔍 Lines data:', response.data.lines);
      console.log('🔍 Totals data:', response.data.totals);
      setInvoiceData(response.data);
    } catch (err) {
      console.error('Error loading invoice:', err);
      setError('Không thể tải chi tiết hóa đơn');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleViewPdf = async (order) => {
    try {
      // Lấy PDF với token (không ghi log)
      const response = await api.getInvoicePdf(order.id);
      const blob = await response.blob();
      
      // Tạo URL cho blob và mở trong tab mới
      const pdfUrl = URL.createObjectURL(blob);
      const newWindow = window.open(pdfUrl, '_blank');
      
      // Cleanup URL sau khi mở
      if (newWindow) {
        newWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(pdfUrl);
        });
      } else {
        // Fallback nếu popup bị chặn
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `hoa_don_${order.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pdfUrl);
      }
    } catch (err) {
      console.error('Error viewing PDF:', err);
      setError('Không thể xem PDF: ' + err.message);
    }
  };

  const handlePrintInvoice = async (order) => {
    try {
      const user = getUser();
      
      // Lấy PDF với token
      const response = await api.getInvoicePdf(order.id);
      const blob = await response.blob();
      
      // Tạo URL cho blob và mở trong tab mới với print dialog
      const pdfUrl = URL.createObjectURL(blob);
      const printWindow = window.open(pdfUrl, '_blank');
      
      if (printWindow) {
        // Tự động mở print dialog khi PDF load xong
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
        
        // Cleanup URL sau khi đóng cửa sổ
        printWindow.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(pdfUrl);
        });
      } else {
        // Fallback nếu popup bị chặn
        alert('Popup bị chặn. Vui lòng cho phép popup để in hóa đơn.');
        URL.revokeObjectURL(pdfUrl);
      }
      
      // Ghi log in hóa đơn
      await api.logInvoicePrint(order.id, {
        printed_by: user?.user_id,
        note: 'In lại từ lịch sử đơn hàng'
      });
      
    } catch (err) {
      console.error('Error printing invoice:', err);
      setError('Không thể in hóa đơn: ' + err.message);
    }
  };

  const closeInvoiceModal = () => {
    setSelectedOrder(null);
    setInvoiceData(null);
    setError(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'OPEN': return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PAID': return 'Đã thanh toán';
      case 'OPEN': return 'Chưa thanh toán';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Lỗi tải dữ liệu</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchOrders}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.shift) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-600">
          <p className="text-lg font-semibold">Không có ca làm việc</p>
          <p className="text-sm mt-1">Vui lòng mở ca làm việc để xem đơn hàng</p>
        </div>
      </div>
    );
  }

  const { shift, orders, stats } = data;

  return (
    <div className="space-y-6">
      {/* Thông tin ca làm việc */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ca làm việc hiện tại</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Nhân viên</p>
            <p className="font-semibold">{shift.nhan_vien.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Bắt đầu ca</p>
            <p className="font-semibold">{formatDateTime(shift.started_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Loại ca</p>
            <p className="font-semibold">{shift.shift_type}</p>
          </div>
        </div>
      </div>

      {/* Thống kê tổng quan */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Thống kê ca làm việc</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.total_orders}</p>
            <p className="text-sm text-gray-600">Tổng đơn</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.paid_orders}</p>
            <p className="text-sm text-gray-600">Đã thanh toán</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.open_orders}</p>
            <p className="text-sm text-gray-600">Chưa thanh toán</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.cancelled_orders}</p>
            <p className="text-sm text-gray-600">Đã hủy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.total_revenue)}</p>
            <p className="text-sm text-gray-600">Doanh thu</p>
          </div>
        </div>
      </div>

      {/* Danh sách đơn hàng */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Đơn hàng trong ca</h3>
            <button 
              onClick={fetchOrders}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Làm mới
            </button>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            <p>Chưa có đơn hàng nào trong ca này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bàn/Khách
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số món
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.order_type === 'DINE_IN' ? (
                        <div>
                          <p className="font-medium">{order.ten_ban || 'N/A'}</p>
                          {order.khu_vuc_ten && (
                            <p className="text-xs text-gray-500">{order.khu_vuc_ten}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Mang đi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.order_type === 'DINE_IN' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {order.order_type === 'DINE_IN' ? 'Tại bàn' : 'Mang đi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.trang_thai)}`}>
                        {getStatusText(order.trang_thai)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.so_mon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.tong_tien)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <p>Mở: {formatDateTime(order.opened_at)}</p>
                        {order.closed_at && (
                          <p>Đóng: {formatDateTime(order.closed_at)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        {order.trang_thai === 'PAID' && (
                          <>
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              👁️ Xem
                            </button>
                            <button
                              onClick={() => handlePrintInvoice(order)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              🖨️ In
                            </button>
                          </>
                        )}
                        {order.trang_thai === 'OPEN' && (
                          <span className="text-xs text-gray-400">Chưa thanh toán</span>
                        )}
                        {order.trang_thai === 'CANCELLED' && (
                          <>
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              👁️ Xem chi tiết
                            </button>
                            {order.ly_do_huy && (
                              <span className="text-xs text-red-500" title={order.ly_do_huy}>
                                📝 {order.ly_do_huy.substring(0, 20)}{order.ly_do_huy.length > 20 ? '...' : ''}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                Chi tiết hóa đơn #{selectedOrder.id}
              </h2>
              <button
                onClick={closeInvoiceModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {invoiceLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Đang tải chi tiết hóa đơn...</span>
                </div>
              ) : invoiceData ? (
                <div className="space-y-6">
                  {/* Status Banner for Cancelled Orders */}
                  {selectedOrder.trang_thai === 'CANCELLED' && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Đơn hàng đã bị hủy</h3>
                          {selectedOrder.ly_do_huy && (
                            <div className="mt-2 text-sm text-red-700">
                              <p><strong>Lý do:</strong> {selectedOrder.ly_do_huy}</p>
                            </div>
                          )}
                          {selectedOrder.closed_at && (
                            <div className="mt-1 text-xs text-red-600">
                              Thời gian hủy: {formatDateTime(selectedOrder.closed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Header Info */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Mã đơn</p>
                        <p className="font-semibold">#{invoiceData.header.order_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Bàn/Khách</p>
                        <p className="font-semibold">{invoiceData.header.ban_label || 'Mang đi'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Thu ngân</p>
                        <p className="font-semibold">{invoiceData.header.thu_ngan || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Thời gian</p>
                        <p className="font-semibold">{formatDateTime(invoiceData.header.opened_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Chi tiết món</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Món</th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">SL</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Đơn giá</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceData.lines.map((line, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">
                                <div>
                                  <p className="font-medium">{line.mon_ten}</p>
                                  {line.bien_the_ten && (
                                    <p className="text-sm text-gray-500">{line.bien_the_ten}</p>
                                  )}
                                  {line.ghi_chu && (
                                    <p className="text-sm text-gray-500 italic">Ghi chú: {line.ghi_chu}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center">{line.so_luong}</td>
                              <td className="px-4 py-2 text-right">{formatCurrency(line.don_gia)}</td>
                              <td className="px-4 py-2 text-right font-medium">{formatCurrency(line.line_total_with_addons)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Tạm tính:</span>
                        <span>{formatCurrency(invoiceData.totals.subtotal_after_lines)}</span>
                      </div>
                      {invoiceData.totals.discount_amount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Giảm giá:</span>
                          <span>-{formatCurrency(invoiceData.totals.discount_amount)}</span>
                        </div>
                      )}
                      {invoiceData.totals.vat_amount > 0 && (
                        <div className="flex justify-between">
                          <span>VAT ({invoiceData.totals.vat_rate}%):</span>
                          <span>+{formatCurrency(invoiceData.totals.vat_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>TỔNG CỘNG:</span>
                        <span>{formatCurrency(invoiceData.totals.grand_total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payments */}
                  {invoiceData.payments && invoiceData.payments.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Thanh toán</h3>
                      <div className="space-y-2">
                        {invoiceData.payments.map((payment, index) => {
                          // Map payment method names to proper Vietnamese
                          const getPaymentMethodName = (code, name) => {
                            if (code === 'CASH') return 'Tiền mặt';
                            if (code === 'ONLINE') return 'Thanh toán online';
                            if (code === 'CARD') return 'Thẻ ATM/Visa';
                            if (code === 'BANK') return 'Chuyển khoản';
                            if (code === 'QR') return 'QR Code';
                            return name || code;
                          };
                          
                          return (
                            <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                              <div>
                                <span className="font-medium">{getPaymentMethodName(payment.method_code, payment.method_name)}</span>
                                {payment.tx_ref && (
                                  <span className="text-sm text-gray-500 ml-2">({payment.tx_ref})</span>
                                )}
                              </div>
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(payment.amount)}</div>
                              {payment.change_given > 0 && (
                                <div className="text-sm text-gray-500">Thừa: {formatCurrency(payment.change_given)}</div>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedOrder.trang_thai === 'PAID' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => handleViewPdf(selectedOrder)}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        📄 Xem PDF
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(selectedOrder)}
                        className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        🖨️ In lại hóa đơn
                      </button>
                    </div>
                  )}
                  
                  {selectedOrder.trang_thai !== 'PAID' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={closeInvoiceModal}
                        className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                      >
                        Đóng
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-red-600">
                  <p>Không thể tải chi tiết hóa đơn</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
