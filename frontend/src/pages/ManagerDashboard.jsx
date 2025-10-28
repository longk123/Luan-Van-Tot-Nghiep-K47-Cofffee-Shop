import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProfitReport from '../components/manager/ProfitReport';
import { COLORS } from '../constants/colors';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import { getUser } from '../auth.js';

export default function ManagerDashboard() {
  const navigate = useNavigate();

  // Get user info
  const user = getUser();
  const userRoles = user?.roles || [];
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [revenueChart, setRevenueChart] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('day'); // day, week, month, quarter, year, custom
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  // Khởi tạo customStartDate và customEndDate với giá trị mặc định (7 ngày gần nhất)
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6); // 7 ngày trước
    return date.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicesPerPage = 20;
  
  // State cho thanh tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  
  // State cho modal xem/in lại hoá đơn
  const [showInvoiceDetail, setShowInvoiceDetail] = useState(false);
  const [showReprintConfirm, setShowReprintConfirm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [reprintReason, setReprintReason] = useState('');
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);

  // Hàm tính toán khoảng thời gian
  const getTimeRangeParams = (range, date) => {
    // Parse date string as local date (không convert timezone)
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day); // month is 0-indexed
    
    switch (range) {
      case 'day':
        return {
          days: 1,
          startDate: date,
          endDate: date
        };
      case 'week':
        const weekStart = new Date(targetDate);
        // Tính ngày Thứ Hai của tuần (ISO 8601: tuần bắt đầu từ Thứ Hai)
        const dayOfWeek = weekStart.getDay(); // 0 = Chủ Nhật, 1 = Thứ Hai, ...
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Nếu Chủ Nhật thì lùi 6 ngày
        weekStart.setDate(targetDate.getDate() + daysToMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Chủ Nhật tuần sau
        return {
          days: 7,
          startDate: formatDate(weekStart),
          endDate: formatDate(weekEnd)
        };
      case 'month':
        const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        return {
          days: monthEnd.getDate(),
          startDate: formatDate(monthStart),
          endDate: formatDate(monthEnd)
        };
      case 'quarter':
        const quarter = Math.floor(targetDate.getMonth() / 3);
        const quarterStart = new Date(targetDate.getFullYear(), quarter * 3, 1);
        const quarterEnd = new Date(targetDate.getFullYear(), quarter * 3 + 3, 0);
        return {
          days: Math.ceil((quarterEnd - quarterStart) / (1000 * 60 * 60 * 24)),
          startDate: formatDate(quarterStart),
          endDate: formatDate(quarterEnd)
        };
      case 'year':
        const yearStart = new Date(targetDate.getFullYear(), 0, 1);
        const yearEnd = new Date(targetDate.getFullYear(), 11, 31);
        return {
          days: 365,
          startDate: formatDate(yearStart),
          endDate: formatDate(yearEnd)
        };
      case 'custom':
        // Sử dụng customStartDate và customEndDate từ state
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          return {
            days: daysDiff,
            startDate: customStartDate,
            endDate: customEndDate
          };
        }
        return { days: 7 }; // Fallback nếu chưa chọn
      default:
        return { days: 7 };
    }
  };
  
  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setInvoicePage(1); // Reset về trang 1 khi load data mới

      // Check if user is still logged in
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        navigate('/login');
        return;
      }

      console.log('🔍 Loading data...');

      // Tính toán khoảng thời gian
      const timeParams = getTimeRangeParams(timeRange, customDate);
      console.log('🔍 Time range params:', {
        timeRange,
        customDate,
        customStartDate,
        customEndDate,
        calculated: timeParams
      });

      // Load Revenue Chart trước để có data cho tất cả các ngày
      // Truyền startDate và endDate thay vì chỉ days
      const revenueResponse = await api.getRevenueChart({
        startDate: timeParams.startDate,
        endDate: timeParams.endDate
      });
      console.log('✅ Revenue data loaded:', revenueResponse);
      console.log('🔍 Revenue data structure:', JSON.stringify(revenueResponse.data, null, 2));
      setRevenueChart(revenueResponse.data);

      // Load Invoices để tính số đơn hàng
      const invoicesResponse = await api.getAllInvoices({ limit: 1000 }); // Lấy nhiều để tính toán
      console.log('✅ Invoices data loaded:', invoicesResponse);
      console.log('🔍 Invoices response structure:', {
        hasData: !!invoicesResponse.data,
        dataKeys: Object.keys(invoicesResponse.data || {}),
        dataLength: invoicesResponse.data?.length,
        isArray: Array.isArray(invoicesResponse.data),
        firstItem: invoicesResponse.data?.[0]
      });
      // Backend trả về data: Array(221) trực tiếp, không phải data: { data: [...] }
      setInvoices(Array.isArray(invoicesResponse.data) ? invoicesResponse.data : []);

      // Load KPI data
      // Nếu chọn "Ngày" thì query ngày đó
      // Nếu chọn khoảng thời gian khác, tính tổng từ revenue chart data và invoices
      if (timeRange === 'day') {
        const kpiResponse = await api.getOverviewKPIs(customDate);
        console.log('✅ KPI data loaded:', kpiResponse);
        console.log('🔍 KPI data structure:', JSON.stringify(kpiResponse.data, null, 2));
        setKpis(kpiResponse.data);
      } else {
        // Tính KPI từ revenue chart data và invoices (tổng cả khoảng thời gian)
        const totalRevenue = revenueResponse.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
        const dineInRevenue = revenueResponse.data.datasets[1].data.reduce((sum, val) => sum + val, 0);
        const takeawayRevenue = revenueResponse.data.datasets[2].data.reduce((sum, val) => sum + val, 0);
        
        // Lọc invoices trong khoảng thời gian HIỆN TẠI
        const [startYear, startMonth, startDay] = timeParams.startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = timeParams.endDate.split('-').map(Number);
        const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        
        const allInvoices = Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [];
        
        const invoicesInRange = allInvoices.filter(invoice => {
          // Sử dụng closed_at thay vì opened_at để khớp với backend
          // Chỉ tính đơn đã thanh toán (có closed_at)
          if (!invoice.closed_at) return false;
          const invoiceDate = new Date(invoice.closed_at);
          return invoiceDate >= startDate && invoiceDate <= endDate;
        });
        
        console.log('🔍 Invoices in range:', {
          total: invoicesInRange.length,
          firstInvoiceFull: invoicesInRange[0]
        });
        console.log('🔍 First invoice detailed:', JSON.stringify(invoicesInRange[0], null, 2));
        
        const paidOrders = invoicesInRange.filter(inv => inv.status === 'PAID').length;
        const openOrders = invoicesInRange.filter(inv => inv.status === 'OPEN').length;
        const cancelledOrders = invoicesInRange.filter(inv => inv.status === 'CANCELLED').length;
        const dineInOrders = invoicesInRange.filter(inv => inv.order_type === 'DINE_IN' && inv.status === 'PAID').length;
        const takeawayOrders = invoicesInRange.filter(inv => inv.order_type === 'TAKEAWAY' && inv.status === 'PAID').length;
        
        // Tính số bàn được sử dụng (unique table name) - bàn nào có đơn thì tính
        const dineInInvoices = invoicesInRange.filter(inv => inv.table?.name && inv.order_type === 'DINE_IN');
        const usedTables = new Set(dineInInvoices.map(inv => inv.table.name)).size;
        
        console.log('🔍 Used tables calculation:', {
          dineInInvoices: dineInInvoices.length,
          tableNames: dineInInvoices.slice(0, 5).map(inv => inv.table.name),
          uniqueTables: Array.from(new Set(dineInInvoices.map(inv => inv.table.name))),
          usedTables
        });
        
        // Tính KPI cho khoảng thời gian TRƯỚC ĐÓ để so sánh
        const daysDiff = timeParams.days;
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
        const prevEndDate = new Date(endDate);
        prevEndDate.setDate(prevEndDate.getDate() - daysDiff);
        
        const invoicesInPrevRange = allInvoices.filter(invoice => {
          // Sử dụng closed_at thay vì opened_at để khớp với backend
          // Chỉ tính đơn đã thanh toán (có closed_at)
          if (!invoice.closed_at) return false;
          const invoiceDate = new Date(invoice.closed_at);
          return invoiceDate >= prevStartDate && invoiceDate <= prevEndDate;
        });
        
        const prevPaidOrders = invoicesInPrevRange.filter(inv => inv.status === 'PAID').length;
        const prevRevenue = invoicesInPrevRange
          .filter(inv => inv.status === 'PAID')
          .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        const prevDineInInvoices = invoicesInPrevRange.filter(inv => inv.table?.name && inv.order_type === 'DINE_IN');
        const prevUsedTables = new Set(prevDineInInvoices.map(inv => inv.table.name)).size;
        
        // Tính % thay đổi
        const revenueChangePercent = prevRevenue > 0 
          ? ((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)
          : 0;
        const ordersChangePercent = prevPaidOrders > 0
          ? ((paidOrders - prevPaidOrders) / prevPaidOrders * 100).toFixed(1)
          : 0;
        const tablesChangePercent = prevUsedTables > 0
          ? ((usedTables - prevUsedTables) / prevUsedTables * 100).toFixed(1)
          : 0;
        
        console.log('🔍 Comparison data:', {
          current: { revenue: totalRevenue, orders: paidOrders, tables: usedTables },
          previous: { revenue: prevRevenue, orders: prevPaidOrders, tables: prevUsedTables },
          change: { revenue: revenueChangePercent, orders: ordersChangePercent, tables: tablesChangePercent }
        });
        
        // Tạo KPI data structure từ tổng revenue và invoices
        setKpis({
          revenue: {
            today: totalRevenue,
            yesterday: prevRevenue,
            change_percent: parseFloat(revenueChangePercent)
          },
          orders: {
            paid: paidOrders,
            open: openOrders,
            cancelled: cancelledOrders,
            change_percent: parseFloat(ordersChangePercent)
          },
          tables: {
            active: usedTables,
            total: 11,
            utilization_percent: (usedTables / 11 * 100).toFixed(1),
            change_percent: parseFloat(tablesChangePercent)
          },
          kitchen: {
            queue_count: 0
          },
          order_types: {
            dine_in: dineInOrders,
            takeaway: takeawayOrders
          }
        });
        console.log('✅ KPI calculated from revenue chart and invoices:', { 
          totalRevenue, 
          paidOrders, 
          openOrders,
          dineInOrders,
          takeawayOrders,
          invoicesInRange: invoicesInRange.length 
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading data:', error);
      
      // If 401 error, redirect to login
      if (error.response?.status === 401 || error.message?.includes('401')) {
        console.log('❌ Unauthorized, redirecting to login');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      
      // Show error message
      alert('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data on component mount
  useEffect(() => {
    loadData();
  }, []); // Empty dependency array = chỉ chạy 1 lần khi mount

  // Auto-reload when time range or custom date changes
  useEffect(() => {
    // Skip first render (already loaded by mount effect)
    if (kpis !== null || revenueChart !== null) {
      loadData();
    }
  }, [timeRange, customDate, customStartDate, customEndDate]); // Reload when any of these changes

  // Handler: Xem chi tiết hoá đơn
  const handleViewInvoice = async (invoice) => {
    try {
      setSelectedInvoice(invoice);
      setLoadingInvoiceDetail(true);
      setShowInvoiceDetail(true);
      
      // Gọi API lấy chi tiết hoá đơn
      const response = await api.getInvoiceData(invoice.id);
      console.log('🔍 Invoice API response:', response);
      
      // Backend trả về { success: true, data: { header, lines, payments, totals } }
      // api.js request() trả về toàn bộ response object
      let detail;
      if (response.data) {
        // Nếu có nested .data
        detail = response.data;
      } else if (response.header || response.lines) {
        // Nếu response trực tiếp là bundle
        detail = response;
      } else {
        // Fallback
        detail = response;
      }
      
      console.log('🔍 Invoice detail:', detail);
      console.log('🔍 Header:', detail.header);
      console.log('🔍 Lines:', detail.lines);
      console.log('🔍 Payments:', detail.payments);
      console.log('🔍 Totals:', detail.totals);
      
      setInvoiceDetail(detail);
      
    } catch (error) {
      console.error('❌ Error loading invoice detail:', error);
      alert('Không thể tải chi tiết hoá đơn.');
      setShowInvoiceDetail(false);
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  // Handler: Xác nhận in lại
  const handleReprintConfirm = (invoice) => {
    setSelectedInvoice(invoice);
    setReprintReason('');
    setShowReprintConfirm(true);
  };

  // Handler: Thực hiện in lại
  const handleReprint = async () => {
    if (!selectedInvoice) return;
    
    try {
      // Lấy PDF và mở print dialog
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hoa-don/${selectedInvoice.id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Mở cửa sổ mới để print
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
      
      // Gọi API ghi log in lại
      await api.logInvoicePrint(selectedInvoice.id, {
        printed_by: null, // Backend sẽ lấy từ token hoặc để null
        note: reprintReason || 'Manager in lại hoá đơn'
      });
      
      console.log('✅ Invoice reprinted:', selectedInvoice.id);
      setShowReprintConfirm(false);
      setSelectedInvoice(null);
      
    } catch (error) {
      console.error('❌ Error reprinting invoice:', error);
      alert('Không thể in lại hoá đơn. Vui lòng thử lại.');
    }
  };

  return (
    <AuthedLayout>
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          {/* Left: Title and Description */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#d4a574] to-[#c9975b] rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Khu vực</h1>
              <p className="text-sm text-gray-500 mt-0.5">5 khu vực đang hoạt động</p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            {/* Nút Quản lý Khu vực */}
            <button
              onClick={() => navigate('/areas')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Quản lý Khu vực</span>
            </button>

            {/* Nút Đi tới Bếp */}
            <button
              onClick={() => navigate('/kitchen')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Đi tới Bếp</span>
            </button>

            {/* Nút DS Mang đi */}
            <button
              onClick={() => navigate('/takeaway')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span>DS Mang đi</span>
            </button>

            {/* Nút Lịch sử đơn */}
            <button
              onClick={() => setActiveTab('invoices')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Lịch sử đơn</span>
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Chọn khoảng thời gian thống kê
        </h3>
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            {[
              { value: 'day', label: 'Ngày' },
              { value: 'week', label: 'Tuần' },
              { value: 'month', label: 'Tháng' },
              { value: 'quarter', label: 'Quý' },
              { value: 'year', label: 'Năm' },
              { value: 'custom', label: 'Tùy chỉnh' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  timeRange === option.value
                    ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white shadow-md border-2 border-[#c9975b]'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gradient-to-r hover:from-[#d4a574] hover:via-[#c9975b] hover:to-[#d4a574] hover:text-white hover:border-[#c9975b]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom date range inputs */}
          {timeRange === 'custom' && (
            <div className="flex gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">Từ:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  console.log('📅 Custom start date changed:', e.target.value);
                  setCustomStartDate(e.target.value);
                  // useEffect sẽ tự động reload, không cần gọi loadData() ở đây
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">Đến:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  console.log('📅 Custom end date changed:', e.target.value);
                  setCustomEndDate(e.target.value);
                  // useEffect sẽ tự động reload, không cần gọi loadData() ở đây
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Reference date for all time ranges except custom */}
          {timeRange !== 'custom' && (
            <div className="flex gap-3 items-center">
              <label className="text-sm font-medium text-gray-700">Ngày tham chiếu:</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  console.log('📅 Reference date changed:', e.target.value);
                  setCustomDate(e.target.value);
                  // useEffect sẽ tự động reload, không cần gọi loadData() ở đây
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {(() => {
            const params = getTimeRangeParams(timeRange, customDate);
            return `Khoảng thời gian: ${params.startDate} đến ${params.endDate} (${params.days} ngày)`;
          })()}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'overview', name: 'Tổng quan', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )},
            { id: 'revenue', name: 'Doanh thu', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )},
            { id: 'profit', name: 'Lợi nhuận', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )},
            { id: 'invoices', name: 'Hóa đơn', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gradient-to-r hover:from-[#f5e6d3] hover:via-[#f0ddc4] hover:to-[#f5e6d3] hover:text-[#c9975b]'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Doanh thu Card */}
          <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl shadow-sm border-2 border-amber-300 p-6 hover:shadow-xl hover:border-amber-400 transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">
                Doanh thu từ {getTimeRangeParams(timeRange, customDate).startDate} đến {getTimeRangeParams(timeRange, customDate).endDate}
              </h3>
            </div>
            <p className="text-2xl font-bold text-amber-600 mb-2">
              {kpis ? `${kpis.revenue?.today?.toLocaleString('vi-VN')} đ` : '0 đ'}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              {kpis && kpis.revenue?.change_percent !== 0 ? (
                <>
                  {kpis.revenue?.change_percent > 0 ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  <span>{Math.abs(kpis.revenue?.change_percent || 0)}% so với {timeRange === 'day' ? 'hôm qua' : timeRange === 'week' ? 'tuần trước' : timeRange === 'month' ? 'tháng trước' : timeRange === 'quarter' ? 'quý trước' : 'năm trước'}</span>
                </>
              ) : (
                <span>{timeRange === 'day' ? 'Dữ liệu ngày được chọn' : 'Tổng trong khoảng thời gian'}</span>
              )}
            </p>
          </div>

          {/* Đơn hàng Card */}
          <div className="bg-gradient-to-br from-blue-50 via-white to-sky-50 rounded-2xl shadow-sm border-2 border-blue-300 p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Đơn đã thanh toán</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-2">
              {kpis ? kpis.orders?.paid : '0'}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              {timeRange === 'day'
                ? (kpis && kpis.orders?.change_percent !== 0 ? (
                    <>
                      {kpis.orders?.change_percent > 0 ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      <span>{Math.abs(kpis.orders?.change_percent || 0)}% so với hôm qua</span>
                    </>
                  ) : (
                    <span>Dữ liệu ngày được chọn</span>
                  ))
                : (kpis && kpis.orders?.change_percent !== 0 ? (
                    <>
                      {kpis.orders?.change_percent > 0 ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      <span>{Math.abs(kpis.orders?.change_percent || 0)}% so với {timeRange === 'week' ? 'tuần trước' : timeRange === 'month' ? 'tháng trước' : timeRange === 'quarter' ? 'quý trước' : 'năm trước'}</span>
                    </>
                  ) : (
                    <span>Không có dữ liệu kỳ trước</span>
                  ))
              }
            </p>
          </div>

          {/* Bàn Card */}
          <div className="bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 rounded-2xl shadow-sm border-2 border-purple-300 p-6 hover:shadow-xl hover:border-purple-400 transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Bàn được sử dụng</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600 mb-2">
              {kpis ? `${kpis.tables?.active} / ${kpis.tables?.total}` : '0 / 11'}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              {timeRange === 'day'
                ? (kpis ? <span>{kpis.tables?.utilization_percent}% công suất</span> : <span>Đang cập nhật</span>)
                : (kpis && kpis.tables?.change_percent !== 0 ? (
                    <>
                      {kpis.tables?.change_percent > 0 ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      <span>{Math.abs(kpis.tables?.change_percent || 0)}% so với {timeRange === 'week' ? 'tuần trước' : timeRange === 'month' ? 'tháng trước' : timeRange === 'quarter' ? 'quý trước' : 'năm trước'}</span>
                    </>
                  ) : (
                    <span>Không có dữ liệu kỳ trước</span>
                  ))
              }
            </p>
          </div>

          {/* Món chờ bếp Card */}
          <div className="bg-gradient-to-br from-emerald-50 via-white to-green-50 rounded-2xl shadow-sm border-2 border-emerald-300 p-6 hover:shadow-xl hover:border-emerald-400 transition-all duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Món chờ bếp</h3>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mb-2">
              {kpis ? kpis.kitchen?.queue_count : '0'}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              {timeRange === 'day'
                ? (kpis ? <span>{kpis.order_types?.dine_in || 0} tại bàn, {kpis.order_types?.takeaway || 0} mang đi</span> : <span>0 tại bàn, 0 mang đi</span>)
                : (
                  <>
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Chỉ hiển thị khi chọn "Ngày"</span>
                  </>
                )
              }
            </p>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '150px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '24px', height: '24px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Biểu đồ doanh thu từ {getTimeRangeParams(timeRange, customDate).startDate} đến {getTimeRangeParams(timeRange, customDate).endDate}</span>
          </h3>
          {revenueChart ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '14px' }}>Tổng doanh thu</p>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#059669' }}>
                    {revenueChart.datasets?.[0]?.data?.reduce((sum, val) => sum + val, 0)?.toLocaleString('vi-VN') || '0'} VNĐ
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '14px' }}>Tại bàn</p>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {revenueChart.datasets?.[1]?.data?.reduce((sum, val) => sum + val, 0)?.toLocaleString('vi-VN') || '0'} VNĐ
                  </p>
                </div>
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#6b7280', fontSize: '14px' }}>Mang đi</p>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {revenueChart.datasets?.[2]?.data?.reduce((sum, val) => sum + val, 0)?.toLocaleString('vi-VN') || '0'} VNĐ
                  </p>
                </div>
              </div>
              <div style={{ height: '400px', marginTop: '20px', backgroundColor: '#fafafa', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#374151', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg style={{ width: '20px', height: '20px', color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>Biểu đồ doanh thu từ {getTimeRangeParams(timeRange, customDate).startDate} đến {getTimeRangeParams(timeRange, customDate).endDate}</span>
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChart.labels?.map((label, index) => ({
                    date: label,
                    total: revenueChart.datasets?.[0]?.data?.[index] || 0,
                    dineIn: revenueChart.datasets?.[1]?.data?.[index] || 0,
                    takeaway: revenueChart.datasets?.[2]?.data?.[index] || 0
                  })) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value?.toLocaleString('vi-VN')} VNĐ`, 
                        name === 'total' ? 'Tổng' : name === 'dineIn' ? 'Tại bàn' : 'Mang đi'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke={COLORS.success.dark}
                      strokeWidth={3}
                      name="Tổng doanh thu"
                      dot={{ fill: COLORS.success.dark, strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="dineIn" 
                      stroke={COLORS.primary.main}
                      strokeWidth={2}
                      name="Tại bàn"
                      dot={{ fill: COLORS.primary.main, strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="takeaway" 
                      stroke={COLORS.accent.main}
                      strokeWidth={2}
                      name="Mang đi"
                      dot={{ fill: COLORS.accent.main, strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6b7280' }}>Chưa có dữ liệu doanh thu</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'profit' && (
        <ProfitReport 
          startDate={getTimeRangeParams(timeRange, customDate).startDate}
          endDate={getTimeRangeParams(timeRange, customDate).endDate}
        />
      )}

      {activeTab === 'invoices' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '150px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg style={{ width: '24px', height: '24px', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Danh sách hóa đơn {timeRange === 'day' ? `ngày ${customDate}` :
                                  timeRange === 'week' ? 'tuần này' :
                                  timeRange === 'month' ? 'tháng này' :
                                  timeRange === 'quarter' ? 'quý này' : 'năm nay'}</span>
          </h3>
          
          {/* Search Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <svg style={{ width: '18px', height: '18px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo ID, bàn, trạng thái, hoặc số tiền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 44px',
                  fontSize: '14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    color: '#9ca3af',
                    padding: '4px'
                  }}
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {(() => {
            // Filter invoices theo khoảng thời gian
            const timeParams = getTimeRangeParams(timeRange, customDate);
            const [startYear, startMonth, startDay] = timeParams.startDate.split('-').map(Number);
            const [endYear, endMonth, endDay] = timeParams.endDate.split('-').map(Number);
            const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
            const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
            
            let filteredInvoices = (invoices || []).filter(invoice => {
              // Sử dụng closed_at thay vì opened_at để khớp với backend
              // Chỉ hiển thị đơn đã thanh toán (có closed_at)
              if (!invoice.closed_at) return false;
              const invoiceDate = new Date(invoice.closed_at);
              return invoiceDate >= startDate && invoiceDate <= endDate;
            });
            
            // Apply search filter
            if (searchQuery.trim()) {
              const query = searchQuery.toLowerCase().trim();
              filteredInvoices = filteredInvoices.filter(invoice => {
                const idMatch = invoice.id.toString().includes(query);
                const tableMatch = invoice.order_type === 'TAKEAWAY' 
                  ? 'mang đi'.includes(query) || 'takeaway'.includes(query)
                  : (invoice.table?.name || '').toLowerCase().includes(query);
                const statusMatch = (
                  (invoice.status === 'PAID' && ('đã thanh toán'.includes(query) || 'paid'.includes(query))) ||
                  (invoice.status === 'CANCELLED' && ('đã hủy'.includes(query) || 'cancelled'.includes(query) || 'hủy'.includes(query))) ||
                  (invoice.status === 'OPEN' && ('chờ thanh toán'.includes(query) || 'open'.includes(query)))
                );
                const amountMatch = invoice.total_amount.toString().includes(query);
                
                return idMatch || tableMatch || statusMatch || amountMatch;
              });
            }
            
            console.log('🔍 Filtered invoices:', {
              total: filteredInvoices.length,
              dateRange: `${timeParams.startDate} to ${timeParams.endDate}`
            });
            
            // Pagination
            const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
            const startIndex = (invoicePage - 1) * invoicesPerPage;
            const endIndex = startIndex + invoicesPerPage;
            const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
            
            return filteredInvoices && filteredInvoices.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg style={{ width: '18px', height: '18px', color: '#166534' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '14px', color: '#166534', fontWeight: '500' }}>
                    Tổng số: {filteredInvoices.length} hóa đơn
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => setInvoicePage(prev => Math.max(1, prev - 1))}
                    disabled={invoicePage === 1}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: invoicePage === 1 ? '#e5e7eb' : '#3b82f6',
                      color: invoicePage === 1 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: invoicePage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Trước</span>
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151', padding: '8px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                    Trang {invoicePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setInvoicePage(prev => Math.min(totalPages, prev + 1))}
                    disabled={invoicePage === totalPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: invoicePage === totalPages ? '#e5e7eb' : '#3b82f6',
                      color: invoicePage === totalPages ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: invoicePage === totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>Sau</span>
                    <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 10 }}>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>ID</span>
                      </div>
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>Bàn</span>
                      </div>
                    </th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>Giảm giá</span>
                      </div>
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Tổng tiền</span>
                      </div>
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Trạng thái</span>
                      </div>
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Thời gian</span>
                      </div>
                    </th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                        <span>Thao tác</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>#{invoice.id}</td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {invoice.order_type === 'TAKEAWAY' ? 'Mang đi' : (invoice.table?.name || 'Không xác định')}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#dc2626', textAlign: 'right' }}>
                        {invoice.total_discount > 0 ? `-${invoice.total_discount?.toLocaleString('vi-VN')} VNĐ` : '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                        {invoice.total_amount?.toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: invoice.status === 'PAID' ? '#dcfce7' : invoice.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                          color: invoice.status === 'PAID' ? '#166534' : invoice.status === 'CANCELLED' ? '#dc2626' : '#92400e',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {invoice.status === 'PAID' ? (
                            <>
                              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Đã thanh toán</span>
                            </>
                          ) : invoice.status === 'CANCELLED' ? (
                            <>
                              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Đã hủy</span>
                            </>
                          ) : (
                            <>
                              <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Chờ thanh toán</span>
                            </>
                          )}
                        </span>
                      </td>
                   <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                     {invoice.closed_at ? new Date(invoice.closed_at).toLocaleString('vi-VN', {
                       timeZone: 'Asia/Ho_Chi_Minh',
                       year: 'numeric',
                       month: '2-digit',
                       day: '2-digit',
                       hour: '2-digit',
                       minute: '2-digit'
                     }) : 'Chưa thanh toán'}
                   </td>
                   <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                     {invoice.status === 'PAID' ? (
                       <div className="flex gap-2 justify-center">
                         <button
                           onClick={() => handleViewInvoice(invoice)}
                           className="px-3 py-1.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-lg font-bold transition-colors shadow-sm text-xs inline-flex items-center gap-1"
                           onMouseEnter={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.backgroundImage='none';e.currentTarget.style.color='#c9975b';e.currentTarget.style.borderColor='#c9975b';}}
                           onMouseLeave={(e)=>{e.currentTarget.style.background='';e.currentTarget.style.backgroundImage='';e.currentTarget.style.color='';e.currentTarget.style.borderColor='#c9975b';}}
                         >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                           </svg>
                           Xem
                         </button>
                         <button
                           onClick={() => handleReprintConfirm(invoice)}
                           className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white border-2 border-green-600 rounded-lg font-bold transition-colors shadow-sm text-xs inline-flex items-center gap-1"
                           onMouseEnter={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.backgroundImage='none';e.currentTarget.style.color='#16a34a';e.currentTarget.style.borderColor='#16a34a';}}
                           onMouseLeave={(e)=>{e.currentTarget.style.background='';e.currentTarget.style.backgroundImage='';e.currentTarget.style.color='white';e.currentTarget.style.borderColor='#16a34a';}}
                         >
                           <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                           </svg>
                           In lại
                         </button>
                       </div>
                     ) : invoice.status === 'CANCELLED' ? (
                       <button
                         onClick={() => handleViewInvoice(invoice)}
                         className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-red-600 rounded-lg font-bold transition-colors shadow-sm text-xs inline-flex items-center gap-1"
                         onMouseEnter={(e)=>{e.currentTarget.style.background='white';e.currentTarget.style.backgroundImage='none';e.currentTarget.style.color='#dc2626';e.currentTarget.style.borderColor='#dc2626';}}
                         onMouseLeave={(e)=>{e.currentTarget.style.background='';e.currentTarget.style.backgroundImage='';e.currentTarget.style.color='white';e.currentTarget.style.borderColor='#dc2626';}}
                       >
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                         </svg>
                         Xem chi tiết
                       </button>
                     ) : (
                       <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                         Chưa thanh toán
                       </span>
                     )}
                   </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6b7280' }}>Chưa có dữ liệu hóa đơn</p>
            </div>
          );
          })()}
        </div>
      )}

      {/* Modal: Xem chi tiết hoá đơn */}
      {showInvoiceDetail && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setShowInvoiceDetail(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                Chi tiết hoá đơn #{selectedInvoice?.id}
              </h2>
              <button
                onClick={() => setShowInvoiceDetail(false)}
                className="w-10 h-10 rounded-full border-2 border-[#c9975b] bg-[#c9975b] text-white flex items-center justify-center transition-colors"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#c9975b';
                  e.target.style.borderColor = '#c9975b';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#c9975b';
                  e.target.style.color = 'white';
                  e.target.style.borderColor = '#c9975b';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {loadingInvoiceDetail ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Đang tải...</p>
              </div>
            ) : invoiceDetail ? (
              <div>
                {/* Thông tin header - giống cashier modal */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', fontSize: '14px' }}>
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Mã đơn</span>
                      <span style={{ fontSize: '16px', fontWeight: '600' }}>#{selectedInvoice.id}</span>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Thu ngân</span>
                      <span style={{ fontWeight: '500' }}>{invoiceDetail.header?.thu_ngan || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Bàn/Khách</span>
                      <span style={{ fontWeight: '600' }}>
                        {selectedInvoice.order_type === 'TAKEAWAY' ? 'Mang đi' : (invoiceDetail.header?.ban_label || selectedInvoice.table?.name || 'N/A')}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Thời gian thanh toán</span>
                      <span style={{ fontWeight: '500' }}>
                        {selectedInvoice.closed_at ? new Date(selectedInvoice.closed_at).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) : 'Chưa thanh toán'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chi tiết món */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb' }}>
                    Chi tiết món
                  </h3>
                  {invoiceDetail.lines && invoiceDetail.lines.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Món</th>
                          <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '600', color: '#6b7280' }}>SL</th>
                          <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>Đơn giá</th>
                          <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: '600', color: '#6b7280' }}>Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceDetail.lines.map((line, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 4px' }}>
                              <div>{line.ten_mon}{line.ten_bien_the ? ` (${line.ten_bien_the})` : ''}</div>
                              {line.options && line.options.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                  {line.options.map(opt => {
                                    if (opt.loai === 'AMOUNT') {
                                      const qty = opt.so_luong ?? 1;
                                      return `${opt.ten} x${qty}${opt.don_vi ? ' ' + opt.don_vi : ''}`;
                                    } else {
                                      const pct = Math.round((opt.he_so ?? 0) * 100);
                                      return `${opt.ten} ${pct}%`;
                                    }
                                  }).join(' • ')}
                                </div>
                              )}
                              {line.ghi_chu && (
                                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px', fontStyle: 'italic' }}>
                                  Ghi chú: {line.ghi_chu}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '10px 4px', textAlign: 'center' }}>{line.so_luong}</td>
                            <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                              {((line.don_gia || 0) - (line.giam_gia || 0)).toLocaleString('vi-VN')} đ
                            </td>
                            <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: '600' }}>
                              {(line.line_total_with_addons || 0).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>Không có món nào</p>
                  )}
                </div>

                {/* Tạm tính & Tổng cộng */}
                <div style={{ marginBottom: '24px', paddingTop: '16px', borderTop: '2px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                    <span>Tạm tính:</span>
                    <span style={{ fontWeight: '600' }}>
                      {(invoiceDetail.totals?.subtotal_after_lines || invoiceDetail.totals?.subtotal_before_lines || selectedInvoice.total_amount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    <span>TỔNG CỘNG:</span>
                    <span style={{ color: selectedInvoice.status === 'CANCELLED' ? '#dc2626' : '#8b6f47' }}>
                      {(invoiceDetail.totals?.grand_total || selectedInvoice.total_amount || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Thanh toán */}
                {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Thanh toán</h3>
                    {invoiceDetail.payments.map((payment, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>{payment.method_name}:</span>
                        <span style={{ fontWeight: '600' }}>{(payment.amount || 0).toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thông báo đơn hủy */}
                {selectedInvoice.status === 'CANCELLED' && (
                  <div style={{ 
                    marginBottom: '24px', 
                    padding: '16px', 
                    backgroundColor: '#fef2f2', 
                    border: '2px solid #dc2626',
                    borderRadius: '8px'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: '700', 
                      color: '#dc2626', 
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      ❌ ĐƠN HÀNG ĐÃ BỊ HỦY
                    </div>
                    {invoiceDetail.header?.ly_do_huy && (
                      <div style={{ fontSize: '14px', color: '#991b1b', textAlign: 'center' }}>
                        <strong>Lý do:</strong> {invoiceDetail.header.ly_do_huy}
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#ef4444' }}>Không thể tải dữ liệu hoá đơn</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Xác nhận in lại */}
      {showReprintConfirm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowReprintConfirm(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              🖨️ Xác nhận in lại hoá đơn
            </h2>
            <p style={{ marginBottom: '16px', color: '#6b7280' }}>
              Bạn có chắc muốn in lại hoá đơn <strong>#{selectedInvoice?.id}</strong>?
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Lý do in lại (tùy chọn):
              </label>
              <textarea
                value={reprintReason}
                onChange={(e) => setReprintReason(e.target.value)}
                placeholder="Nhập lý do in lại (ví dụ: khách yêu cầu, in bị lỗi...)"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowReprintConfirm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: '2px solid #6b7280',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#6b7280';
                  e.target.style.borderColor = '#6b7280';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#6b7280';
                  e.target.style.color = 'white';
                  e.target.style.borderColor = '#6b7280';
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleReprint}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#8b6f47',
                  color: 'white',
                  border: '2px solid #8b6f47',
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.color = '#8b6f47';
                  e.target.style.borderColor = '#8b6f47';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#8b6f47';
                  e.target.style.color = 'white';
                  e.target.style.borderColor = '#8b6f47';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Xác nhận in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Navigation Buttons */}
    </AuthedLayout>
  );
}