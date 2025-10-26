import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Clock } from 'lucide-react';

export default function KPICards({ data }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatPercent = (percent) => {
    const isPositive = percent >= 0;
    return (
      <span className={`flex items-center text-sm ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}>
        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {Math.abs(percent)}%
      </span>
    );
  };

  const cards = [
    {
      title: 'Doanh thu hôm nay',
      value: formatCurrency(data.revenue?.today || 0),
      change: data.revenue?.change_percent || 0,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Đơn hàng đã thanh toán',
      value: data.orders?.paid || 0,
      change: data.orders?.change_percent || 0,
      icon: <ShoppingCart className="w-6 h-6" />,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Bàn đang phục vụ',
      value: `${data.tables?.active || 0}/${data.tables?.total || 0}`,
      subtitle: `${data.tables?.utilization_percent || 0}% sử dụng`,
      icon: <Users className="w-6 h-6" />,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Món chờ bếp',
      value: data.kitchen?.queue_count || 0,
      icon: <Clock className="w-6 h-6" />,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className={`${card.bgColor} rounded-lg p-6 border border-gray-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
              )}
              {card.change !== undefined && (
                <div className="mt-2">
                  {formatPercent(card.change)}
                </div>
              )}
            </div>
            <div className={`${card.iconColor} p-3 rounded-lg bg-white`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
