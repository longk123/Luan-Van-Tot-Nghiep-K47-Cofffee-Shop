import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ProfitReport from '../components/manager/ProfitReport';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [revenueChart, setRevenueChart] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('week'); // day, week, month, quarter, year, custom
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicesPerPage = 20;
  
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
      console.log('🔍 Time range params:', timeParams);

      // Load Revenue Chart trước để có data cho tất cả các ngày
      const revenueResponse = await api.getRevenueChart(timeParams.days);
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
          const invoiceDate = new Date(invoice.opened_at);
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
          const invoiceDate = new Date(invoice.opened_at);
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
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Manager Dashboard</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Tổng quan và phân tích hiệu suất quán</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '10px 15px', backgroundColor: '#3b82f6', color: 'white', borderWidth: '0', borderStyle: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          🔄 Làm mới
        </button>
      </div>

      {/* Time Range Controls */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '10px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>
          📅 Chọn khoảng thời gian thống kê
        </h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { value: 'day', label: '📅 Ngày', icon: '📅' },
              { value: 'week', label: '📊 Tuần', icon: '📊' },
              { value: 'month', label: '📈 Tháng', icon: '📈' },
              { value: 'quarter', label: '📋 Quý', icon: '📋' },
              { value: 'year', label: '🗓️ Năm', icon: '🗓️' },
              { value: 'custom', label: '⚙️ Tùy chỉnh', icon: '⚙️' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: timeRange === option.value ? '#3b82f6' : '#f3f4f6',
                  color: timeRange === option.value ? 'white' : '#374151',
                  borderWidth: '0',
                  borderStyle: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {option.icon} {option.label}
              </button>
            ))}
          </div>
          
          {/* Custom date range inputs */}
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                Từ:
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
              <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                Đến:
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>
          )}
          
          {/* Reference date for Quarter/Year */}
          {(timeRange === 'quarter' || timeRange === 'year') && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>
                Ngày tham chiếu:
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>
          )}
          
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#9ca3af' : '#10b981',
              color: 'white',
              borderWidth: '0',
              borderStyle: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? '⏳ Đang tải...' : '🔄 Tải dữ liệu'}
          </button>
        </div>
        
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
          {(() => {
            const params = getTimeRangeParams(timeRange, customDate);
            return `Khoảng thời gian: ${params.startDate} đến ${params.endDate} (${params.days} ngày)`;
          })()}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { id: 'overview', name: '📊 Tổng quan', icon: '📊' },
            { id: 'revenue', name: '💰 Doanh thu', icon: '💰' },
            { id: 'profit', name: '📈 Lợi nhuận', icon: '📈' },
            { id: 'invoices', name: '📄 Hóa đơn', icon: '📄' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 15px',
                backgroundColor: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#059669' }}>
            💰 Doanh thu {timeRange === 'day' ? 'hôm nay' : timeRange === 'week' ? 'tuần này' : timeRange === 'month' ? 'tháng này' : timeRange === 'quarter' ? 'quý này' : 'năm nay'}
          </h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {kpis ? `${kpis.revenue?.today?.toLocaleString('vi-VN')} VNĐ` : '1,250,000 VNĐ'}
          </p>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
            {kpis && kpis.revenue?.change_percent !== 0 
              ? `${kpis.revenue?.change_percent > 0 ? '↗️' : '↘️'} ${Math.abs(kpis.revenue?.change_percent || 0)}% so với ${
                  timeRange === 'day' ? 'hôm qua' : 
                  timeRange === 'week' ? 'tuần trước' : 
                  timeRange === 'month' ? 'tháng trước' : 
                  timeRange === 'quarter' ? 'quý trước' : 
                  'năm trước'
                }` 
              : `${timeRange === 'day' ? 'Dữ liệu ngày được chọn' : 'Tổng trong khoảng thời gian'}`
            }
          </p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#3b82f6' }}>
            🛒 Đơn hàng đã thanh toán
          </h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {kpis ? kpis.orders?.paid : '45'}
          </p>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
            {timeRange === 'day' 
              ? (kpis && kpis.orders?.change_percent !== 0
                  ? `${kpis.orders?.change_percent > 0 ? '↗️' : '↘️'} ${Math.abs(kpis.orders?.change_percent || 0)}% so với hôm qua`
                  : 'Dữ liệu ngày được chọn')
              : (kpis && kpis.orders?.change_percent !== 0
                  ? `${kpis.orders?.change_percent > 0 ? '↗️' : '↘️'} ${Math.abs(kpis.orders?.change_percent || 0)}% so với ${
                      timeRange === 'week' ? 'tuần trước' : 
                      timeRange === 'month' ? 'tháng trước' : 
                      timeRange === 'quarter' ? 'quý trước' : 
                      'năm trước'
                    }`
                  : 'Không có dữ liệu kỳ trước')
            }
          </p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b' }}>🪑 Bàn được sử dụng</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {kpis ? `${kpis.tables?.active} / ${kpis.tables?.total}` : '8 / 20'}
          </p>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
            {timeRange === 'day'
              ? (kpis ? `${kpis.tables?.utilization_percent}% công suất` : 'Đang cập nhật')
              : (kpis && kpis.tables?.change_percent !== 0
                  ? `${kpis.tables?.change_percent > 0 ? '↗️' : '↘️'} ${Math.abs(kpis.tables?.change_percent || 0)}% so với ${
                      timeRange === 'week' ? 'tuần trước' : 
                      timeRange === 'month' ? 'tháng trước' : 
                      timeRange === 'quarter' ? 'quý trước' : 
                      'năm trước'
                    }`
                  : 'Không có dữ liệu kỳ trước')
            }
          </p>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#dc2626' }}>🍳 Món chờ bếp</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {kpis ? kpis.kitchen?.queue_count : '12'}
          </p>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
            {timeRange === 'day'
              ? (kpis ? `${kpis.order_types?.dine_in || 0} tại bàn, ${kpis.order_types?.takeaway || 0} mang đi` : '8 tại bàn, 4 mang đi')
              : '⚠️ Chỉ hiển thị khi chọn "Ngày"'
            }
          </p>
        </div>
      </div>
      
        </div>
      )}

      {activeTab === 'revenue' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
            📈 Biểu đồ doanh thu {timeRange === 'day' ? 'theo ngày' : 
                                  timeRange === 'week' ? '7 ngày gần nhất' :
                                  timeRange === 'month' ? 'theo tháng' :
                                  timeRange === 'quarter' ? 'theo quý' :
                                  'theo năm'}
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
                <h4 style={{ margin: '0 0 20px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                  📈 Biểu đồ doanh thu theo ngày
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
                      stroke="#059669" 
                      strokeWidth={3}
                      name="Tổng doanh thu"
                      dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="dineIn" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Tại bàn"
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="takeaway" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Mang đi"
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6b7280' }}>Chưa có dữ liệu doanh thu</p>
              <button 
                onClick={loadData}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  borderWidth: '0',
                  borderStyle: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Tải dữ liệu
              </button>
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
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '100px' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
            📄 Danh sách hóa đơn {timeRange === 'day' ? `ngày ${customDate}` : 
                                  timeRange === 'week' ? 'tuần này' :
                                  timeRange === 'month' ? 'tháng này' :
                                  timeRange === 'quarter' ? 'quý này' : 'năm nay'}
          </h3>
          {(() => {
            // Filter invoices theo khoảng thời gian
            const timeParams = getTimeRangeParams(timeRange, customDate);
            const [startYear, startMonth, startDay] = timeParams.startDate.split('-').map(Number);
            const [endYear, endMonth, endDay] = timeParams.endDate.split('-').map(Number);
            const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
            const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
            
            const filteredInvoices = (invoices || []).filter(invoice => {
              const invoiceDate = new Date(invoice.opened_at);
              return invoiceDate >= startDate && invoiceDate <= endDate;
            });
            
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
                <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#166534', fontWeight: '500' }}>
                    📊 Tổng số: {filteredInvoices.length} hóa đơn
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
                      borderRadius: '6px',
                      cursor: invoicePage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    ← Trước
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
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
                      borderRadius: '6px',
                      cursor: invoicePage === totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Sau →
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 10 }}>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>Bàn</th>
                    <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>Giảm giá</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>Tổng tiền</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>Trạng thái</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>Thời gian</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: '14px', fontWeight: '600' }}>Thao tác</th>
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
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: invoice.status === 'PAID' ? '#dcfce7' : invoice.status === 'CANCELLED' ? '#fee2e2' : '#fef3c7',
                          color: invoice.status === 'PAID' ? '#166534' : invoice.status === 'CANCELLED' ? '#dc2626' : '#92400e'
                        }}>
                          {invoice.status === 'PAID' ? '✅ Đã thanh toán' : invoice.status === 'CANCELLED' ? '❌ Đã hủy' : '⏳ Chờ thanh toán'}
                        </span>
                      </td>
                   <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                     {new Date(invoice.opened_at).toLocaleString('vi-VN', {
                       timeZone: 'Asia/Ho_Chi_Minh',
                       year: 'numeric',
                       month: '2-digit',
                       day: '2-digit',
                       hour: '2-digit',
                       minute: '2-digit'
                     })}
                   </td>
                   <td style={{ padding: '12px', fontSize: '14px', textAlign: 'center' }}>
                     {invoice.status === 'PAID' ? (
                       <>
                         <button
                           onClick={() => handleViewInvoice(invoice)}
                           style={{
                             padding: '6px 12px',
                             marginRight: '8px',
                             backgroundColor: '#3b82f6',
                             color: 'white',
                             borderWidth: '0',
                             borderStyle: 'none',
                             borderRadius: '4px',
                             cursor: 'pointer',
                             fontSize: '13px',
                             fontWeight: '500'
                           }}
                           onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                           onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                         >
                           👁️ Xem
                         </button>
                         <button
                           onClick={() => handleReprintConfirm(invoice)}
                           style={{
                             padding: '6px 12px',
                             backgroundColor: '#10b981',
                             color: 'white',
                             borderWidth: '0',
                             borderStyle: 'none',
                             borderRadius: '4px',
                             cursor: 'pointer',
                             fontSize: '13px',
                             fontWeight: '500'
                           }}
                           onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                           onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
                         >
                           🖨️ In lại
                         </button>
                       </>
                     ) : invoice.status === 'CANCELLED' ? (
                       <button
                         onClick={() => handleViewInvoice(invoice)}
                         style={{
                           padding: '6px 12px',
                           backgroundColor: '#6b7280',
                           color: 'white',
                           borderWidth: '0',
                           borderStyle: 'none',
                           borderRadius: '4px',
                           cursor: 'pointer',
                           fontSize: '13px',
                           fontWeight: '500'
                         }}
                         onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                         onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
                       >
                         👁️ Xem
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
              <button 
                onClick={loadData}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  borderWidth: '0',
                  borderStyle: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Tải dữ liệu
              </button>
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
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✕ Đóng
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
                      <span style={{ color: '#6b7280', display: 'block', marginBottom: '4px' }}>Thời gian</span>
                      <span style={{ fontWeight: '500' }}>
                        {new Date(selectedInvoice.opened_at).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
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
                    <span style={{ color: selectedInvoice.status === 'CANCELLED' ? '#dc2626' : '#059669' }}>
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

                {/* Nút thao tác - CHỈ hiển thị cho đơn PAID */}
                {selectedInvoice.status === 'PAID' && (
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        const token = localStorage.getItem('token');
                        window.open(`/api/v1/hoa-don/${selectedInvoice.id}/pdf?token=${token}`, '_blank');
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      📄 Xem PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowInvoiceDetail(false);
                        handleReprintConfirm(selectedInvoice);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      🖨️ In lại hoá đơn
                    </button>
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
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleReprint}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                ✅ Xác nhận in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Navigation Buttons */}
      <button 
        onClick={() => navigate('/dashboard')}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#2563eb';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#3b82f6';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
        }}
      >
        💰 Đi tới trang Thu ngân
      </button>
      <button 
        onClick={() => window.location.href = '/kitchen'}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '280px',
          padding: '12px 24px',
          backgroundColor: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#047857';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#059669';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.4)';
        }}
      >
        🍳 Đi tới trang Bếp
      </button>
    </div>
  );
}