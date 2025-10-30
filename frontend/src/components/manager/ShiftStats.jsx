import { Clock, User, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function ShiftStats({ data = [] }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'OPEN': { color: 'bg-blue-100 text-blue-800', text: 'Đang mở' },
      'CLOSED': { color: 'bg-green-100 text-green-800', text: 'Đã đóng' },
      'CANCELLED': { color: 'bg-red-100 text-red-800', text: 'Đã hủy' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getShiftTypeBadge = (type) => {
    const typeConfig = {
      'CASHIER': { color: 'bg-purple-100 text-purple-800', text: 'Thu ngân' },
      'KITCHEN': { color: 'bg-orange-100 text-orange-800', text: 'Pha chế' }
    };
    
    const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800', text: type };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getCashDiffColor = (diff) => {
    if (diff > 0) return 'text-green-600';
    if (diff < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getCashDiffIcon = (diff) => {
    if (diff > 0) return <TrendingUp className="w-4 h-4" />;
    if (diff < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê ca làm việc (7 ngày gần nhất)</h3>
        <div className="flex items-center justify-center h-32 text-gray-500">
          Không có dữ liệu để hiển thị
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Tổng ca làm</h4>
              <p className="text-2xl font-bold text-blue-600">{data.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Tổng doanh thu</h4>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.reduce((sum, shift) => sum + shift.stats.net_amount, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <User className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-purple-900">Tổng đơn hàng</h4>
              <p className="text-2xl font-bold text-purple-600">
                {data.reduce((sum, shift) => sum + shift.stats.total_orders, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-orange-600 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-orange-900">Ca có chênh lệch</h4>
              <p className="text-2xl font-bold text-orange-600">
                {data.filter(shift => shift.stats.cash_diff !== 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Chi tiết ca làm việc</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ca làm việc
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhân viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thống kê
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thanh toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{shift.name}</div>
                      <div className="text-sm text-gray-500">{getShiftTypeBadge(shift.type)}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{shift.staff}</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Mở: {formatDateTime(shift.started_at)}
                    </div>
                    {shift.closed_at && (
                      <div className="text-sm text-gray-500">
                        Đóng: {formatDateTime(shift.closed_at)}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {shift.stats.total_orders} đơn hàng
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(shift.stats.net_amount)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {shift.stats.cash_amount > 0 && (
                        <div className="text-sm text-gray-600">
                          Tiền mặt: {formatCurrency(shift.stats.cash_amount)}
                        </div>
                      )}
                      {shift.stats.card_amount > 0 && (
                        <div className="text-sm text-gray-600">
                          Thẻ: {formatCurrency(shift.stats.card_amount)}
                        </div>
                      )}
                      {shift.stats.online_amount > 0 && (
                        <div className="text-sm text-gray-600">
                          Online: {formatCurrency(shift.stats.online_amount)}
                        </div>
                      )}
                      {shift.stats.cash_diff !== 0 && (
                        <div className={`text-sm font-medium flex items-center ${getCashDiffColor(shift.stats.cash_diff)}`}>
                          {getCashDiffIcon(shift.stats.cash_diff)}
                          <span className="ml-1">
                            {shift.stats.cash_diff > 0 ? '+' : ''}{formatCurrency(shift.stats.cash_diff)}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(shift.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
