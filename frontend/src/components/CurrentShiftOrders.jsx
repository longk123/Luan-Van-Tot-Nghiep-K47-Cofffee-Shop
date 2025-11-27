// src/components/CurrentShiftOrders.jsx
import { useState, useEffect, useMemo } from 'react';
import { api } from '../api.js';
import { getUser } from '../auth.js';
import useSSE from '../hooks/useSSE.js';

export default function CurrentShiftOrders({ viewOnly = false, isWaiter = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('CREATED'); // 'CREATED' hoặc 'DELIVERED' (chỉ cho waiter)
  const [showUnclaimDialog, setShowUnclaimDialog] = useState(false);
  const [unclaimOrderId, setUnclaimOrderId] = useState(null);
  const [unclaimReason, setUnclaimReason] = useState('');
  
  // Filter và Pagination states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

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
      setError(null); // Reset error
      
      const response = await api.getInvoiceData(order.id);
      console.log('🔍 Invoice data received:', response.data);
      console.log('🔍 Lines data:', response.data.lines);
      console.log('🔍 Totals data:', response.data.totals);
      setInvoiceData(response.data);
    } catch (err) {
      console.error('Error loading invoice:', err);
      // Hiển thị thông báo lỗi chi tiết hơn
      const errorMessage = err.response?.data?.error || err.message || 'Không thể tải chi tiết hóa đơn';
      setError(errorMessage);
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

  const handleUnclaimDelivery = (orderId) => {
    setUnclaimOrderId(orderId);
    setUnclaimReason('');
    setShowUnclaimDialog(true);
  };

  const confirmUnclaimDelivery = async () => {
    if (!unclaimReason || unclaimReason.trim().length === 0) {
      setError('Vui lòng nhập lý do hủy nhận đơn');
      return;
    }

    try {
      await api.unclaimDeliveryOrders([unclaimOrderId], unclaimReason.trim());
      // Refresh danh sách đơn
      await fetchOrders();
      
      // Đóng dialog và reset
      setShowUnclaimDialog(false);
      setUnclaimOrderId(null);
      setUnclaimReason('');
      setError(null);
    } catch (err) {
      console.error('Error unclaiming delivery:', err);
      setError('Không thể hủy nhận đơn: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const closeInvoiceModal = () => {
    setSelectedOrder(null);
    setInvoiceData(null);
    setError(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'bg-green-50 text-green-700 border border-green-300 font-semibold';
      case 'OPEN': return 'bg-amber-50 text-amber-700 border border-amber-300 font-semibold';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border border-red-300 font-semibold';
      default: return 'bg-gray-50 text-gray-700 border border-gray-300 font-semibold';
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

  const getDeliveryStatusColor = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'CLAIMED':
      case 'ASSIGNED': return 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-50 text-purple-700 border border-purple-300 font-semibold';
      case 'DELIVERED': return 'bg-green-50 text-green-700 border border-green-300 font-semibold';
      case 'FAILED': return 'bg-red-50 text-red-700 border border-red-300 font-semibold';
      case 'PENDING': return 'bg-gray-50 text-gray-700 border border-gray-300 font-semibold';
      default: return 'bg-gray-50 text-gray-700 border border-gray-300 font-semibold';
    }
  };

  const getDeliveryStatusText = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'CLAIMED':
      case 'ASSIGNED': return 'Đã nhận';
      case 'OUT_FOR_DELIVERY': return 'Đang giao';
      case 'DELIVERED': return 'Giao thành công';
      case 'FAILED': return 'Giao thất bại';
      case 'PENDING': return 'Chờ xử lý';
      default: return deliveryStatus || 'Chưa xác định';
    }
  };

  // === HOOKS PHẢI ĐƯỢC GỌI TRƯỚC CÁC RETURN SỚM ===
  const orders = data?.orders || [];
  const isWaiterView = isWaiter || data?.isWaiter;
  
  // Sắp xếp đơn theo thời gian mở mới nhất
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
  }, [orders]);
  
  // Filter orders dựa trên tab (chỉ cho waiter)
  const baseFilteredOrders = useMemo(() => {
    if (!isWaiterView) return sortedOrders;
    if (activeTab === 'DELIVERED') {
      return sortedOrders.filter(order => 
        order.order_type === 'DELIVERY' && order.shipper_id
      );
    } else {
      return sortedOrders.filter(order => 
        order.order_type === 'DINE_IN' || order.order_type === 'TAKEAWAY'
      );
    }
  }, [sortedOrders, isWaiterView, activeTab]);
  
  // Apply status filter
  const statusFilteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return baseFilteredOrders;
    if (statusFilter === 'REFUNDED') {
      return baseFilteredOrders.filter(o => o.total_refunded > 0);
    }
    return baseFilteredOrders.filter(o => o.trang_thai === statusFilter);
  }, [baseFilteredOrders, statusFilter]);
  
  // Pagination
  const totalPages = Math.ceil(statusFilteredOrders.length / ordersPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ordersPerPage;
    return statusFilteredOrders.slice(start, start + ordersPerPage);
  }, [statusFilteredOrders, currentPage, ordersPerPage]);
  
  // Reset page khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, activeTab]);
  
  // For display
  const filteredOrders = paginatedOrders;

  // === EARLY RETURNS SAU HOOKS ===
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#c9975b]"></div>
          <span className="ml-3 text-[#8b6f47] font-semibold text-lg">Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-red-600 mb-2">Lỗi tải dữ liệu</p>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchOrders}
            className="px-6 py-3 bg-[#c9975b] hover:bg-white text-white hover:text-[#c9975b] border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.shift) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-[#f5ebe0] rounded-full flex items-center justify-center shadow-md">
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

  const { shift, stats } = data;
  
  // Sắp xếp đơn theo thời gian mở mới nhất
  // Tính stats cho tab hiện tại (chỉ cho waiter)
  const tabStats = isWaiterView ? (() => {
    const filtered = baseFilteredOrders;
    
    // Nếu là tab "Đơn đã giao", tính stats về đơn giao hàng
    if (activeTab === 'DELIVERED') {
      const deliveryOrders = filtered.filter(o => o.order_type === 'DELIVERY');
      return {
        total_orders: deliveryOrders.length,
        claimed_orders: deliveryOrders.filter(o => 
          o.delivery_status === 'CLAIMED' || o.delivery_status === 'ASSIGNED'
        ).length,
        out_for_delivery: deliveryOrders.filter(o => 
          o.delivery_status === 'OUT_FOR_DELIVERY'
        ).length,
        delivered_orders: deliveryOrders.filter(o => 
          o.delivery_status === 'DELIVERED'
        ).length,
        failed_orders: deliveryOrders.filter(o => 
          o.delivery_status === 'FAILED'
        ).length,
        total_revenue: deliveryOrders
          .filter(o => o.trang_thai === 'PAID')
          .reduce((sum, o) => sum + parseFloat(o.tong_tien || 0), 0)
      };
    } else {
      // Tab "Đơn đã tạo": stats về đơn DINE_IN và TAKEAWAY
      return {
        total_orders: filtered.length,
        paid_orders: filtered.filter(o => o.trang_thai === 'PAID').length,
        open_orders: filtered.filter(o => o.trang_thai === 'OPEN').length,
        cancelled_orders: filtered.filter(o => o.trang_thai === 'CANCELLED').length,
        total_revenue: filtered
          .filter(o => o.trang_thai === 'PAID')
          .reduce((sum, o) => sum + parseFloat(o.tong_tien || 0), 0)
      };
    }
  })() : stats;
  
  // Xác định loại ca dựa trên role của nhân viên, không phải shift_type từ backend
  // Vì backend lưu waiter và cashier đều là CASHIER, nhưng cần hiển thị đúng
  const getShiftTypeLabel = () => {
    if (isWaiterView) {
      return 'PHỤC VỤ';
    }
    if (shift.shift_type === 'KITCHEN') {
      return 'PHA CHẾ/BẾP';
    }
    return 'THU NGÂN';
  };

  return (
    <div className="space-y-6">
      {/* Thông tin ca làm việc */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-[#8b6f47] mb-5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#c9975b] flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          Ca làm việc hiện tại
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#f5ebe0] rounded-xl p-4 border border-[#c9975b]/30 shadow-sm">
            <p className="text-sm text-[#8b6f47] font-bold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Nhân viên
            </p>
            <p className="font-bold text-[#8b6f47]">{shift.nhan_vien.full_name}</p>
          </div>
          <div className="bg-[#f5ebe0] rounded-xl p-4 border border-[#c9975b]/30 shadow-sm">
            <p className="text-sm text-[#8b6f47] font-bold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Bắt đầu ca
            </p>
            <p className="font-bold text-[#8b6f47]">{formatDateTime(shift.started_at)}</p>
          </div>
          <div className="bg-[#f5ebe0] rounded-xl p-4 border border-[#c9975b]/30 shadow-sm">
            <p className="text-sm text-[#8b6f47] font-bold mb-1 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Loại ca
            </p>
            <p className="font-bold text-[#8b6f47]">{getShiftTypeLabel()}</p>
          </div>
        </div>
      </div>

      {/* Tabs cho waiter - Di chuyển lên trên */}
      {isWaiterView && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="px-6 pt-4 border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('CREATED')}
                className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                  activeTab === 'CREATED'
                    ? 'bg-[#c9975b] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Đơn đã tạo
              </button>
              <button
                onClick={() => setActiveTab('DELIVERED')}
                className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                  activeTab === 'DELIVERED'
                    ? 'bg-[#c9975b] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Đơn đã giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thống kê tổng quan */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-[#8b6f47] mb-5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#c9975b] flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          Thống kê ca làm việc
        </h3>
        {isWaiterView && activeTab === 'DELIVERED' ? (
          // Stats cho tab "Đơn đã giao"
          <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="text-sm text-blue-600 mb-1">Tổng đơn đã nhận</div>
              <div className="text-2xl font-bold text-blue-700">{tabStats.total_orders}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <div className="text-sm text-purple-600 mb-1">Đã nhận</div>
              <div className="text-2xl font-bold text-purple-700">{tabStats.claimed_orders}</div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
              <div className="text-sm text-indigo-600 mb-1">Đang giao</div>
              <div className="text-2xl font-bold text-indigo-700">{tabStats.out_for_delivery}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="text-sm text-green-600 mb-1">Giao thành công</div>
              <div className="text-2xl font-bold text-green-700">{tabStats.delivered_orders}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <div className="text-sm text-red-600 mb-1">Giao thất bại</div>
              <div className="text-2xl font-bold text-red-700">{tabStats.failed_orders}</div>
            </div>
          </div>
        ) : (
          // Stats cho tab "Đơn đã tạo" hoặc không phải waiter
          <div className={`grid gap-4 ${isWaiterView ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-5'}`}>
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="text-sm text-blue-600 mb-1">Tổng đơn đã tạo</div>
              <div className="text-2xl font-bold text-blue-700">{isWaiterView ? tabStats.total_orders : stats.total_orders}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <div className="text-sm text-green-600 mb-1">Đã thanh toán</div>
              <div className="text-2xl font-bold text-green-700">{isWaiterView ? tabStats.paid_orders : stats.paid_orders}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
              <div className="text-sm text-amber-600 mb-1">Chưa thanh toán</div>
              <div className="text-2xl font-bold text-amber-700">{isWaiterView ? tabStats.open_orders : stats.open_orders}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
              <div className="text-sm text-red-600 mb-1">Tổng đơn đã hủy</div>
              <div className="text-2xl font-bold text-red-700">{isWaiterView ? tabStats.cancelled_orders : stats.cancelled_orders}</div>
            </div>
            {/* Doanh thu - Ẩn cho waiter */}
            {!isWaiterView && (
              <div className="bg-[#f5ebe0] rounded-lg p-4 border-l-4 border-[#c9975b]">
                <div className="text-sm text-[#8b6f47] mb-1">Doanh thu</div>
                <div className="text-xl font-bold text-[#8b6f47]">{formatCurrency(stats.total_revenue)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Danh sách đơn hàng */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <h3 className="text-lg font-bold text-[#8b6f47] flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#c9975b] flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              Đơn hàng trong ca
              <span className="text-sm font-normal text-gray-500">({statusFilteredOrders.length} đơn)</span>
            </h3>
            <div className="flex items-center gap-3">
              {/* Filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="OPEN">Chưa thanh toán</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="REFUNDED">Đã hoàn tiền</option>
              </select>
              <button 
                onClick={fetchOrders}
                className="px-4 py-2 bg-[#c9975b] hover:bg-white text-white hover:text-[#c9975b] border-2 border-[#c9975b] rounded-xl font-bold transition-all shadow-sm hover:shadow-md text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
          </div>
        </div>
        
        {statusFilteredOrders.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-[#f5ebe0] rounded-full flex items-center justify-center shadow-md">
              <svg className="w-10 h-10 text-[#c9975b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[#8b6f47] font-bold text-lg">
              {isWaiterView 
                ? (activeTab === 'DELIVERED' 
                    ? 'Chưa có đơn giao hàng nào đã được nhận' 
                    : 'Chưa có đơn hàng nào trong ca này')
                : (statusFilter !== 'ALL' ? 'Không có đơn hàng nào với trạng thái này' : 'Chưa có đơn hàng nào trong ca này')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ transform: 'rotateX(180deg)' }}>
            <div style={{ transform: 'rotateX(180deg)' }}>
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Mã đơn
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Bàn/Khách
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Số món
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tổng tiền
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
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
                      ) : order.order_type === 'DELIVERY' ? (
                        <div>
                          <p className="font-bold text-blue-600 mb-1">Giao hàng</p>
                          {order.khach_hang_ten && (
                            <p className="text-xs font-semibold text-gray-900">👤 {order.khach_hang_ten}</p>
                          )}
                          {order.delivery_address && (
                            <p className="text-xs text-gray-600 mt-0.5">📍 {order.delivery_address.length > 40 ? order.delivery_address.substring(0, 40) + '...' : order.delivery_address}</p>
                          )}
                          {order.delivery_phone && (
                            <p className="text-xs text-gray-500 mt-0.5">📞 {order.delivery_phone}</p>
                          )}
                          {order.distance_km && (
                            <p className="text-xs text-blue-600 mt-0.5">📏 Cách {parseFloat(order.distance_km).toFixed(2)}km</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#c9975b] font-medium">Mang đi</span>
                            {order.is_pre_order && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded border border-orange-300">
                                Đặt trước
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                        order.order_type === 'DINE_IN' 
                          ? 'bg-[#f5ebe0] text-[#8b6f47] border border-[#c9975b]' 
                          : order.order_type === 'DELIVERY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-300'
                          : 'bg-orange-50 text-orange-700 border border-orange-300'
                      }`}>
                        {order.order_type === 'DINE_IN' ? 'Tại bàn' : order.order_type === 'DELIVERY' ? 'Giao hàng' : 'Mang đi'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`px-3 py-1.5 text-xs rounded-lg ${getStatusColor(order.trang_thai, order.total_refunded > 0)}`}>
                          {getStatusText(order.trang_thai, order.total_refunded > 0)}
                        </span>
                        {order.total_refunded > 0 && (
                          <span className="px-3 py-1.5 text-xs rounded-lg bg-purple-100 text-purple-700 border border-purple-300">
                            Hoàn: {new Intl.NumberFormat('vi-VN').format(order.total_refunded)}đ
                          </span>
                        )}
                        {order.order_type === 'DELIVERY' && order.delivery_status && (
                          <span className={`px-3 py-1.5 text-xs rounded-lg ${getDeliveryStatusColor(order.delivery_status)}`}>
                            {getDeliveryStatusText(order.delivery_status)}
                          </span>
                        )}
                      </div>
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
                      <div className="flex gap-2 flex-wrap">
                        {order.trang_thai === 'PAID' && (
                          <>
                            <button
                              onClick={() => handleViewInvoice(order)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Xem chi tiết"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {/* Nút In - Ẩn khi Manager đang xem */}
                            {!viewOnly && (
                              <button
                                onClick={() => handlePrintInvoice(order)}
                                className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                title="In"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span className="text-sm">In</span>
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
                              className="text-blue-600 hover:text-blue-800"
                              title="Xem chi tiết"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {order.ly_do_huy && (
                              <span className="text-xs text-red-500 italic font-medium" title={order.ly_do_huy}>
                                {order.ly_do_huy.substring(0, 20)}{order.ly_do_huy.length > 20 ? '...' : ''}
                              </span>
                            )}
                          </>
                        )}
                        {/* Nút Hủy nhận - Chỉ hiển thị cho đơn DELIVERY trong tab "Đơn đã giao" và chưa giao thành công/thất bại */}
                        {isWaiterView && activeTab === 'DELIVERED' && 
                         order.order_type === 'DELIVERY' && 
                         order.delivery_status && 
                         order.delivery_status !== 'DELIVERED' && 
                         order.delivery_status !== 'FAILED' && (
                          <button
                            onClick={() => handleUnclaimDelivery(order.id)}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            title="Hủy nhận đơn (đơn sẽ quay lại mục săn đơn)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-xs font-medium">Hủy nhận</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Hiển thị {((currentPage - 1) * ordersPerPage) + 1} - {Math.min(currentPage * ordersPerPage, statusFilteredOrders.length)} / {statusFilteredOrders.length} đơn
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ««
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <span className="px-4 py-1.5 text-sm font-medium bg-[#c9975b] text-white rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-6 py-5 bg-[#c9975b] border-b border-[#b8864a] shadow-lg">
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
                        <p className="text-sm text-gray-600">Người tạo đơn</p>
                        <p className="font-semibold">{invoiceData.header.nguoi_tao_don || invoiceData.header.thu_ngan || '-'}</p>
                      </div>
                      {invoiceData.header.nguoi_tao_don && invoiceData.header.thu_ngan && invoiceData.header.nguoi_tao_don !== invoiceData.header.thu_ngan && (
                        <div>
                          <p className="text-sm text-gray-600">Thu ngân</p>
                          <p className="font-semibold">{invoiceData.header.thu_ngan}</p>
                        </div>
                      )}
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

      {/* Dialog hủy nhận đơn giao hàng */}
      {showUnclaimDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-200">
            <div className="px-6 py-5 bg-red-50 border-b border-red-200 rounded-t-3xl">
              <h3 className="text-xl font-bold text-red-700 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Hủy nhận đơn giao hàng
              </h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Bạn đang hủy nhận đơn <span className="font-bold">#{unclaimOrderId}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Đơn này sẽ quay lại mục "săn đơn" và có thể được nhận bởi waiter khác.
                </p>
                <p className="text-xs text-amber-600 mb-4 bg-amber-50 p-2 rounded">
                  ⚠️ Chỉ có thể hủy nhận trong <strong>10 phút đầu</strong> sau khi nhận đơn. Nếu đã quá thời gian, vui lòng liên hệ quản lý.
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do hủy nhận <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={unclaimReason}
                  onChange={(e) => setUnclaimReason(e.target.value)}
                  placeholder="Ví dụ: Nhận nhầm đơn, địa chỉ quá xa, không tìm được địa chỉ..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={4}
                  required
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnclaimDialog(false);
                    setUnclaimOrderId(null);
                    setUnclaimReason('');
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmUnclaimDelivery}
                  disabled={!unclaimReason || unclaimReason.trim().length === 0}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Xác nhận hủy nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
