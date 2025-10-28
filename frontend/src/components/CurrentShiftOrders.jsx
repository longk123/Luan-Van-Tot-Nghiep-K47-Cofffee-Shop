// src/components/CurrentShiftOrders.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { getUser } from '../auth.js';
import useSSE from '../hooks/useSSE.js';

export default function CurrentShiftOrders({ viewOnly = false }) {
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
      case 'PAID': return 'bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-2 border-green-400 font-bold shadow-sm';
      case 'OPEN': return 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 border-2 border-yellow-400 font-bold shadow-sm';
      case 'CANCELLED': return 'bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-2 border-red-400 font-bold shadow-sm';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-2 border-gray-400 font-bold shadow-sm';
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
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-lg p-8 border-2 border-[#e7d4b8]">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#e7d4b8] border-t-[#c9975b]"></div>
          <span className="ml-3 text-[#8b6f47] font-semibold text-lg">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-lg p-8 border-2 border-[#e7d4b8]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-100 to-red-50 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-red-600 mb-2">Lỗi tải dữ liệu</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchOrders}
            className="px-6 py-3 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.shift) {
    return (
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-lg p-8 border-2 border-[#e7d4b8]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-full flex items-center justify-center shadow-md">
            <svg className="w-10 h-10 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-lg font-bold text-[#8b6f47] mb-2">Không có ca làm việc</p>
          <p className="text-sm text-[#c9975b]/70">Vui lòng mở ca làm việc để xem đơn hàng</p>
        </div>
      </div>
    );
  }

  const { shift, orders, stats } = data;

  return (
    <div className="space-y-6">
      {/* Thông tin ca làm việc */}
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-lg p-6 border-2 border-[#e7d4b8]">
        <h2 className="text-xl font-bold text-[#8b6f47] mb-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9975b] to-[#d4a574] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Ca làm việc hiện tại
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-xl p-4 border border-[#c9975b]/30 shadow-sm">
            <p className="text-sm text-[#8b6f47] font-bold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Nhân viên
            </p>
            <p className="font-bold text-[#8b6f47]">{shift.nhan_vien.full_name}</p>
          </div>
          <div className="bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-xl p-4 border border-[#c9975b]/30 shadow-sm">
            <p className="text-sm text-[#8b6f47] font-bold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Bắt đầu ca
            </p>
            <p className="font-bold text-[#8b6f47]">{formatDateTime(shift.started_at)}</p>
          </div>
          <div className="bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-xl p-4 border border-[#c9975b]/30 shadow-sm">
            <p className="text-sm text-[#8b6f47] font-bold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Loại ca
            </p>
            <p className="font-bold text-[#8b6f47]">{shift.shift_type}</p>
          </div>
        </div>
      </div>

      {/* Thống kê tổng quan */}
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-lg p-6 border-2 border-[#e7d4b8]">
        <h3 className="text-lg font-bold text-[#8b6f47] mb-5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c9975b] to-[#d4a574] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          Thống kê ca làm việc
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-[#c9975b] to-[#d4a574] rounded-xl p-5 text-center shadow-md border-2 border-[#b88749]">
            <p className="text-3xl font-black text-white mb-1">{stats.total_orders}</p>
            <p className="text-sm text-white/90 font-medium">Tổng đơn</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-center shadow-md border-2 border-green-700">
            <p className="text-3xl font-black text-white mb-1">{stats.paid_orders}</p>
            <p className="text-sm text-white/90 font-medium">Đã thanh toán</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-5 text-center shadow-md border-2 border-yellow-600">
            <p className="text-3xl font-black text-white mb-1">{stats.open_orders}</p>
            <p className="text-sm text-white/90 font-medium">Chưa thanh toán</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-center shadow-md border-2 border-red-700">
            <p className="text-3xl font-black text-white mb-1">{stats.cancelled_orders}</p>
            <p className="text-sm text-white/90 font-medium">Đã hủy</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-center shadow-md border-2 border-purple-700">
            <p className="text-xl font-black text-white mb-1">{formatCurrency(stats.total_revenue)}</p>
            <p className="text-sm text-white/90 font-medium">Doanh thu</p>
          </div>
        </div>
      </div>

      {/* Danh sách đơn hàng */}
      <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-2xl shadow-lg border-2 border-[#e7d4b8]">
        <div className="p-6 border-b-2 border-[#e7d4b8]">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#8b6f47] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#c9975b] to-[#d4a574] flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              Đơn hàng trong ca
            </h3>
            <button 
              onClick={fetchOrders}
              className="px-4 py-2 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] text-white border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#e7d4b8] to-[#fef7ed] rounded-full flex items-center justify-center shadow-md">
              <svg className="w-10 h-10 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#8b6f47] font-bold text-lg">Chưa có đơn hàng nào trong ca này</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#e7d4b8] via-[#fef7ed] to-[#e7d4b8]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Mã đơn
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Bàn/Khách
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Số món
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-[#8b6f47] uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y-2 divide-[#fef7ed]">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gradient-to-r hover:from-[#fffbf5] hover:to-[#fef7ed] transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-[#8b6f47] bg-gradient-to-r from-[#e7d4b8] to-[#fef7ed] px-3 py-1 rounded-lg shadow-sm">
                        #{order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b6f47]">
                      {order.order_type === 'DINE_IN' ? (
                        <div>
                          <p className="font-bold">{order.ten_ban || 'N/A'}</p>
                          {order.khu_vuc_ten && (
                            <p className="text-xs text-[#c9975b]">{order.khu_vuc_ten}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#c9975b] font-medium">Mang đi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm ${
                        order.order_type === 'DINE_IN' 
                          ? 'bg-gradient-to-r from-[#c9975b] to-[#d4a574] text-white border-2 border-[#b88749]' 
                          : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-2 border-orange-600'
                      }`}>
                        {order.order_type === 'DINE_IN' ? 'Tại bàn' : 'Mang đi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs rounded-lg ${getStatusColor(order.trang_thai)}`}>
                        {getStatusText(order.trang_thai)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#8b6f47]">
                      {order.so_mon}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#c9975b]">
                      {formatCurrency(order.tong_tien)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8b6f47]">
                      <div>
                        <p className="font-medium">Mở: {formatDateTime(order.opened_at)}</p>
                        {order.closed_at && (
                          <p className="text-[#c9975b] text-xs">Đóng: {formatDateTime(order.closed_at)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {order.trang_thai === 'PAID' && (
                          <>
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-lg font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-xs flex items-center gap-1"
                              onMouseEnter={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#c9975b';e.currentTarget.style.borderColor='#c9975b';}}
                              onMouseLeave={(e)=>{e.currentTarget.style.background='';e.currentTarget.style.color='';e.currentTarget.style.borderColor='#c9975b';}}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Xem
                            </button>
                            {/* Nút In - Ẩn khi Manager đang xem */}
                            {!viewOnly && (
                              <button
                                onClick={() => handlePrintInvoice(order)}
                                className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-green-600 rounded-lg font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-xs flex items-center gap-1"
                                onMouseEnter={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#16a34a';e.currentTarget.style.borderColor='#16a34a';}}
                                onMouseLeave={(e)=>{e.currentTarget.style.background='';e.currentTarget.style.color='white';e.currentTarget.style.borderColor='#16a34a';}}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                In
                              </button>
                            )}
                          </>
                        )}
                        {order.trang_thai === 'OPEN' && (
                          <span className="text-xs text-[#c9975b]/60 italic font-medium">Chưa thanh toán</span>
                        )}
                        {order.trang_thai === 'CANCELLED' && (
                          <>
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-red-600 rounded-lg font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-xs flex items-center gap-1"
                              onMouseEnter={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.color='#dc2626';e.currentTarget.style.borderColor='#dc2626';}}
                              onMouseLeave={(e)=>{e.currentTarget.style.background='';e.currentTarget.style.color='white';e.currentTarget.style.borderColor='#dc2626';}}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Xem chi tiết
                            </button>
                            {order.ly_do_huy && (
                              <span className="text-xs text-red-500 italic font-medium" title={order.ly_do_huy}>
                                {order.ly_do_huy.substring(0, 20)}{order.ly_do_huy.length > 20 ? '...' : ''}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-white via-[#fffbf5] to-[#fef7ed] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-[#d4a574]/30">
            <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#c9975b] via-[#d4a574] to-[#c9975b] border-b-2 border-[#e7d4b8] shadow-lg">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Chi tiết hóa đơn #{selectedOrder.id}
              </h2>
              <button
                onClick={closeInvoiceModal}
                className="p-2 hover:bg-white/20 rounded-full transition-all hover:scale-110 active:scale-95"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
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
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg border-2 border-blue-600 hover:!bg-white hover:text-blue-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-medium"
                      >
                        📄 Xem PDF
                      </button>
                      {/* Nút In lại - Ẩn khi Manager đang xem */}
                      {!viewOnly && (
                        <button
                          onClick={() => handlePrintInvoice(selectedOrder)}
                          className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg border-2 border-green-600 hover:!bg-white hover:text-green-600 transition-all duration-200 font-medium"
                        >
                          🖨️ In lại hóa đơn
                        </button>
                      )}
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
