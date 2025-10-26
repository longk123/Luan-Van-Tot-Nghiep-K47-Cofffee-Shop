import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function RevenueChart({ data }) {
  const [chartType, setChartType] = useState('line');

  if (!data || !data.labels || !data.datasets) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Biểu đồ doanh thu</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Không có dữ liệu để hiển thị
        </div>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.labels.map((label, index) => ({
    date: label,
    total: data.datasets[0]?.data[index] || 0,
    dineIn: data.datasets[1]?.data[index] || 0,
    takeaway: data.datasets[2]?.data[index] || 0
  }));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Ngày: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Biểu đồ doanh thu (7 ngày gần nhất)</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              chartType === 'line'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Đường
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cột
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Tổng doanh thu"
              />
              <Line 
                type="monotone" 
                dataKey="dineIn" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Tại bàn"
              />
              <Line 
                type="monotone" 
                dataKey="takeaway" 
                stroke="#f97316" 
                strokeWidth={2}
                name="Mang đi"
              />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Tổng doanh thu" />
              <Bar dataKey="dineIn" fill="#22c55e" name="Tại bàn" />
              <Bar dataKey="takeaway" fill="#f97316" name="Mang đi" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900">Tổng doanh thu 7 ngày</h4>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.total, 0))}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-900">Tại bàn</h4>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.dineIn, 0))}
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-orange-900">Mang đi</h4>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.takeaway, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
