import { TrendingUp, Coffee, Utensils } from 'lucide-react';

export default function TopMenuItems({ data = [] }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getItemIcon = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('cà phê') || lowerName.includes('coffee')) {
      return <Coffee className="w-5 h-5 text-amber-600" />;
    }
    return <Utensils className="w-5 h-5 text-green-600" />;
  };

  const getRankColor = (index) => {
    const colors = [
      'bg-yellow-100 text-yellow-800', // #1
      'bg-gray-100 text-gray-800',     // #2
      'bg-orange-100 text-orange-800'  // #3
    ];
    return colors[index] || 'bg-blue-100 text-blue-800';
  };

  const getRankIcon = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top món bán chạy (7 ngày gần nhất)</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          Không có dữ liệu để hiển thị
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Top món bán chạy (7 ngày gần nhất)</h3>
        <div className="flex items-center text-sm text-gray-500">
          <TrendingUp className="w-4 h-4 mr-1" />
          {data.length} món
        </div>
      </div>

      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(index)}`}>
                {getRankIcon(index)}
              </div>
              
              <div className="flex items-center space-x-3">
                {getItemIcon(item.name)}
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  {item.variant && (
                    <p className="text-sm text-gray-500">{item.variant}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{item.quantity_sold}</div>
                <div className="text-gray-500">lượt bán</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-gray-900">{item.order_count}</div>
                <div className="text-gray-500">đơn hàng</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-green-600">{formatCurrency(item.revenue)}</div>
                <div className="text-gray-500">doanh thu</div>
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-gray-900">{formatCurrency(item.average_price)}</div>
                <div className="text-gray-500">TB/đơn</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900">Tổng doanh thu top món</h4>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(data.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-900">Tổng số lượng bán</h4>
          <p className="text-2xl font-bold text-green-600">
            {data.reduce((sum, item) => sum + item.quantity_sold, 0)}
          </p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-purple-900">Tổng đơn hàng</h4>
          <p className="text-2xl font-bold text-purple-600">
            {data.reduce((sum, item) => sum + item.order_count, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
