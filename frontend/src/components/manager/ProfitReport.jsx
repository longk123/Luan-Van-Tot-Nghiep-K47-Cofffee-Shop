import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import * as XLSX from 'xlsx';

export default function ProfitReport({ startDate: propStartDate, endDate: propEndDate }) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [itemAnalysis, setItemAnalysis] = useState(null);
  const [categoryAnalysis, setCategoryAnalysis] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Hiển thị 20 đơn mỗi trang
  const [searchQuery, setSearchQuery] = useState(''); // State cho thanh tìm kiếm
  const [orderTypeFilter, setOrderTypeFilter] = useState(null); // null, 'DINE_IN', 'TAKEAWAY'
  const [activeView, setActiveView] = useState('summary'); // 'summary', 'chart', 'items', 'categories'

  // Sử dụng props từ parent component
  const startDate = propStartDate;
  const endDate = propEndDate;
  
  // Memoize filtered details để tránh tính toán lại nhiều lần
  const filteredDetails = useMemo(() => {
    if (!reportData?.details) return [];
    
    const details = reportData.details;
    if (!searchQuery.trim()) return details;
    
    const query = searchQuery.toLowerCase().trim();
    return details.filter(order => {
      const idMatch = order.orderId?.toString().includes(query);
      const tableMatch = order.table_name ? order.table_name.toLowerCase().includes(query) : false;
      const revenueMatch = order.revenue?.toString().includes(query);
      const costMatch = order.totalCost?.toString().includes(query);
      const profitMatch = order.profit?.toString().includes(query);
      
      return idMatch || tableMatch || revenueMatch || costMatch || profitMatch;
    });
  }, [reportData, searchQuery]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchAllData();
    }
  }, [startDate, endDate, orderTypeFilter]);

  const fetchAllData = async () => {
    if (!startDate || !endDate) {
      console.warn('⚠️ startDate or endDate is empty, skipping fetch');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Fetching profit data with params:', { startDate, endDate, orderTypeFilter });

      // Fetch all data in parallel
      const orderTypeParam = orderTypeFilter ? `&orderType=${orderTypeFilter}` : '';

      const [reportRes, chartRes, itemsRes, categoriesRes, comparisonRes] = await Promise.all([
        api.get(`/analytics/profit-report?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&includeTopping=true${orderTypeParam}`),
        api.get(`/analytics/profit-chart?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
        api.get(`/analytics/profit-by-item?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=20`),
        api.get(`/analytics/profit-by-category?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
        api.get(`/analytics/profit-comparison?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`)
      ]);

      console.log('✅ All data loaded');
      setReportData(reportRes.data);
      setChartData(chartRes.data);
      setItemAnalysis(itemsRes.data);
      setCategoryAnalysis(categoriesRes.data);
      setComparison(comparisonRes.data);

    } catch (error) {
      console.error('❌ Error fetching profit data:', error);
      console.error('❌ Error response:', error.response);
      alert('Lỗi tải báo cáo: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!reportData || !reportData.details) {
      alert('Không có dữ liệu để xuất');
      return;
    }

    const { summary, details } = reportData;

    // Prepare summary data
    const summaryData = [
      ['BÁO CÁO LỢI NHUẬN'],
      [`Từ ngày: ${startDate} đến ${endDate}`],
      [],
      ['Tổng quan'],
      ['Tổng đơn hàng', summary.totalOrders],
      ['Doanh thu', summary.totalRevenue],
      ['Giá vốn món', summary.totalCostMon],
      ['Giá vốn topping', summary.totalCostTopping],
      ['Tổng giá vốn', summary.totalCost],
      ['Lợi nhuận', summary.totalProfit],
      ['Tỷ suất lợi nhuận (%)', summary.margin.toFixed(2)],
      [],
      ['Chi tiết đơn hàng'],
      ['Mã đơn', 'Thời gian', 'Loại đơn', 'Doanh thu', 'Giảm giá', 'Giá vốn món', 'Giá vốn topping', 'Tổng giá vốn', 'Lợi nhuận', 'Tỷ suất (%)']
    ];

    // Add details
    details.forEach(order => {
      summaryData.push([
        `#${order.orderId}`,
        new Date(order.closedAt).toLocaleString('vi-VN'),
        order.orderType === 'DINE_IN' ? 'Tại bàn' : 'Mang đi',
        order.revenue,
        order.totalDiscount,
        order.costMon,
        order.costTopping,
        order.totalCost,
        order.profit,
        order.margin.toFixed(2)
      ]);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo lợi nhuận');

    // Export
    const fileName = `Bao_cao_loi_nhuan_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-600 font-medium">Đang tải báo cáo lợi nhuận...</div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div className="text-gray-500">Không có dữ liệu báo cáo</div>
      </div>
    );
  }

  const { summary, details } = reportData;

  return (
    <div className="space-y-6">
      {/* Filter và Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Order Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Loại đơn:</label>
            <select
              value={orderTypeFilter || ''}
              onChange={(e) => setOrderTypeFilter(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tất cả</option>
              <option value="DINE_IN">Tại bàn</option>
              <option value="TAKEAWAY">Mang đi</option>
            </select>
            {summary && (
              <span className="text-sm text-gray-600">
                ({summary.dineInOrders || 0} tại bàn, {summary.takeawayOrders || 0} mang đi)
              </span>
            )}
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveView('summary')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 Tổng quan
            </button>
            <button
              onClick={() => setActiveView('chart')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'chart'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📈 Biểu đồ
            </button>
            <button
              onClick={() => setActiveView('items')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'items'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🍵 Theo món
            </button>
            <button
              onClick={() => setActiveView('categories')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'categories'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📂 Theo danh mục
            </button>

            {/* Export Button */}
            <button
              onClick={exportToExcel}
              className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Cards */}
      {activeView === 'summary' && comparison && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📊 So sánh với kỳ trước ({comparison.previous.startDate} - {comparison.previous.endDate})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Doanh thu</p>
              <p className={`text-lg font-bold ${comparison.changes.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.changes.revenue >= 0 ? '↑' : '↓'} {Math.abs(comparison.changes.revenue).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Giá vốn</p>
              <p className={`text-lg font-bold ${comparison.changes.cost <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.changes.cost >= 0 ? '↑' : '↓'} {Math.abs(comparison.changes.cost).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Lợi nhuận</p>
              <p className={`text-lg font-bold ${comparison.changes.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.changes.profit >= 0 ? '↑' : '↓'} {Math.abs(comparison.changes.profit).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Tỷ suất</p>
              <p className={`text-lg font-bold ${comparison.changes.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparison.changes.margin >= 0 ? '↑' : '↓'} {Math.abs(comparison.changes.margin).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {activeView === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-opacity-90 text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Doanh thu</span>
              </p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(summary?.totalRevenue)}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Giá vốn */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-opacity-90 text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Tổng giá vốn</span>
              </p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(summary?.totalCost)}</p>
              <div className="mt-2 space-y-1">
                <p className="text-white text-opacity-80 text-xs">Món: {formatCurrency(summary?.totalCostMon)}</p>
                <p className="text-white text-opacity-80 text-xs">Topping: {formatCurrency(summary?.totalCostTopping)}</p>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Lợi nhuận */}
        <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-opacity-90 text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span>Lợi nhuận</span>
              </p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(summary?.totalProfit)}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Tỷ suất lợi nhuận */}
        <div className="bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white text-opacity-90 text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span>Tỷ suất lợi nhuận</span>
              </p>
              <p className="text-3xl font-bold mt-2">{formatPercent(summary?.margin)}</p>
              <p className="text-white text-opacity-80 text-xs mt-2">
                {summary?.totalOrders || 0} đơn hàng
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Chart View */}
      {activeView === 'chart' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Biểu đồ lợi nhuận theo thời gian</h3>
          {chartData && chartData.labels && chartData.labels.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData.labels.map((label, idx) => ({
                date: label,
                revenue: chartData.datasets[0].data[idx],
                cost: chartData.datasets[1].data[idx],
                profit: chartData.datasets[2].data[idx]
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#fbbf24" name="Doanh thu" strokeWidth={2} />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" name="Giá vốn" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" name="Lợi nhuận" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>Không có dữ liệu biểu đồ</p>
            </div>
          )}
        </div>
      )}

      {/* Items Analysis */}
      {activeView === 'items' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🍵 Phân tích lợi nhuận theo món (Top 20)</h3>
          {itemAnalysis && itemAnalysis.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Món</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Danh mục</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SL bán</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Doanh thu</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá vốn</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lợi nhuận</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tỷ suất</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {itemAnalysis.map((item, idx) => (
                  <tr key={item.itemId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.categoryName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{item.quantitySold}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(item.totalRevenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.totalCost)}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(item.totalProfit)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-semibold ${item.marginPercent >= 50 ? 'text-green-600' : item.marginPercent >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {formatPercent(item.marginPercent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Không có dữ liệu phân tích theo món</p>
            </div>
          )}
        </div>
      )}

      {/* Categories Analysis */}
      {activeView === 'categories' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📂 Phân tích lợi nhuận theo danh mục</h3>
          {categoryAnalysis && categoryAnalysis.length > 0 ? (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {categoryAnalysis.map((cat) => (
              <div key={cat.categoryId} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-lg text-gray-800 mb-3">{cat.categoryName}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số lượng bán:</span>
                    <span className="font-semibold">{cat.quantitySold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Doanh thu:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(cat.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giá vốn:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(cat.totalCost)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Lợi nhuận:</span>
                    <span className="font-bold text-green-600">{formatCurrency(cat.totalProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tỷ suất:</span>
                    <span className={`font-bold ${cat.marginPercent >= 50 ? 'text-green-600' : cat.marginPercent >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatPercent(cat.marginPercent)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart for Categories */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoryName" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="totalRevenue" fill="#3b82f6" name="Doanh thu" />
              <Bar dataKey="totalCost" fill="#f97316" name="Giá vốn" />
              <Bar dataKey="totalProfit" fill="#22c55e" name="Lợi nhuận" />
            </BarChart>
          </ResponsiveContainer>
          </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p>Không có dữ liệu phân tích theo danh mục</p>
            </div>
          )}
        </div>
      )}

      {/* Details Toggle */}
      {activeView === 'summary' && (
        <>
      <div className="bg-white rounded-lg shadow p-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>{showDetails ? 'Ẩn' : 'Xem'} chi tiết đơn hàng</span>
          <svg 
            className={`w-5 h-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      {/* Details Table */}
      {showDetails && details && details.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ marginBottom: '150px' }}>
          {/* Search Bar */}
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo ID đơn, bàn, số tiền..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
                }}
                className="w-full pl-12 pr-10 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Xóa tìm kiếm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Pagination info */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-700">
              <span>
                Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDetails.length)} - {Math.min(currentPage * itemsPerPage, filteredDetails.length)} trong tổng số {filteredDetails.length} đơn hàng
                {searchQuery && filteredDetails.length !== details.length && (
                  <span className="text-blue-600 ml-2">(đã lọc từ {details.length})</span>
                )}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Trước</span>
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg">
                Trang {currentPage} / {Math.ceil(filteredDetails.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredDetails.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredDetails.length / itemsPerPage)}
                className="px-4 py-2 text-sm font-medium border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <span>Sau</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Đơn hàng</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Thời gian</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Doanh thu</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Giảm giá</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Giá vốn món</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <span>Giá vốn topping</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Tổng giá vốn</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span>Lợi nhuận</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    <span>Tỷ suất lợi nhuận</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDetails
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.orderId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.closedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(order.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {order.totalDiscount > 0 ? `-${formatCurrency(order.totalDiscount)}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                      {formatCurrency(order.costMon)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                      <div className="flex items-center justify-end gap-1">
                        <span>{formatCurrency(order.costTopping)}</span>
                        {order.costTopping > 0 && (
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(order.totalCost)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      order.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(order.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatPercent(order.margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
