// src/components/manager/EmployeePerformance.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function EmployeePerformance({ employee }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30'); // days

  // Date range
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadStats();
  }, [employee, startDate, endDate]);

  const loadStats = async () => {
    if (!employee?.user_id) {
      console.error('Employee user_id is missing', employee);
      return;
    }
    setLoading(true);
    try {
      console.log('Loading stats for user:', employee.user_id, { startDate, endDate });
      const res = await api.getUserStats(employee.user_id, {
        startDate,
        endDate
      });
      console.log('Stats response:', res);
      console.log('Stats data:', res?.data);
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleTimeRangeChange = (days) => {
    setTimeRange(days);
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    setStartDate(date.toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c9975b] border-t-transparent"></div>
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center text-gray-500">
        Không có dữ liệu
      </div>
    );
  }

  const summary = stats.summary || {};

  return (
    <div>
      {/* Time Range Selector */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Khoảng thời gian:</label>
          <div className="flex gap-2">
            {[
              { value: '7', label: '7 ngày' },
              { value: '30', label: '30 ngày' },
              { value: '90', label: '3 tháng' },
              { value: '180', label: '6 tháng' },
              { value: '365', label: '1 năm' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleTimeRangeChange(option.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  timeRange === option.value
                    ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-[#f5ebe0] hover:text-[#c9975b] border-2 border-transparent hover:border-[#c9975b]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center ml-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-500">đến</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] transition-all duration-200 font-medium shadow-md text-sm"
            >
              Tải lại
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border-l-4 border-gray-400 border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Tổng số ca
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.total_shifts || 0}</div>
        </div>

        {summary.total_orders !== undefined && (
          <>
            <div className="bg-white rounded-lg shadow border-l-4 border-blue-400 border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Tổng đơn hàng
              </div>
              <div className="text-2xl font-bold text-blue-600">{summary.total_orders || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow border-l-4 border-green-400 border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tổng doanh thu
              </div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_revenue || 0)}</div>
            </div>
            <div className="bg-white rounded-lg shadow border-l-4 border-purple-400 border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                TB đơn/ca
              </div>
              <div className="text-2xl font-bold text-purple-600">{summary.avg_orders_per_shift?.toFixed(1) || 0}</div>
            </div>
          </>
        )}

        {summary.total_items_made !== undefined && (
          <>
            <div className="bg-white rounded-lg shadow border-l-4 border-orange-400 border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Tổng món đã làm
              </div>
              <div className="text-2xl font-bold text-orange-600">{summary.total_items_made || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow border-l-4 border-blue-400 border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                TB món/ca
              </div>
              <div className="text-2xl font-bold text-blue-600">{summary.avg_items_per_shift?.toFixed(1) || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow border-l-4 border-purple-400 border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                TB thời gian/món
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {summary.avg_prep_time ? `${Math.round(summary.avg_prep_time)}s` : '-'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detailed Stats */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết hiệu suất</h3>
        
        {stats.details && stats.details.length > 0 ? (
          <div className="space-y-4">
            {stats.details.map((detail, idx) => (
              <div key={idx} className="border-l-4 border-[#c9975b] pl-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">
                    {detail.shift_type === 'CASHIER' ? '👨‍💼 Thu ngân' : '👨‍🍳 Pha chế'}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {detail.total_shifts} ca
                  </span>
                </div>
                
                {detail.shift_type === 'CASHIER' && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Tổng đơn:</span>{' '}
                      <span className="font-medium text-gray-900">{detail.total_orders}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Doanh thu:</span>{' '}
                      <span className="font-medium text-gray-900">{formatCurrency(detail.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">TB doanh thu/ca:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {formatCurrency(detail.total_revenue / detail.total_shifts)}
                      </span>
                    </div>
                  </div>
                )}
                
                {detail.shift_type === 'KITCHEN' && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Tổng món:</span>{' '}
                      <span className="font-medium text-gray-900">{detail.total_items_made}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">TB món/ca:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {(detail.total_items_made / detail.total_shifts).toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">TB thời gian:</span>{' '}
                      <span className="font-medium text-gray-900">
                        {detail.avg_prep_time_seconds ? `${Math.round(detail.avg_prep_time_seconds)}s` : '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Chưa có dữ liệu chi tiết
          </div>
        )}
      </div>
    </div>
  );
}
