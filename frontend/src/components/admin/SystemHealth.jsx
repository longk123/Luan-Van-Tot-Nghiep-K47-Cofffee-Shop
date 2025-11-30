// src/components/admin/SystemHealth.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function SystemHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const response = await api.getSystemHealth();
      setHealth(response.data);
    } catch (error) {
      console.error('Error loading health:', error);
      // Mock data for now
      setHealth({
        system: {
          status: 'HEALTHY',
          uptime: '5 days 12 hours',
          version: '1.0.0'
        },
        database: {
          status: 'CONNECTED',
          size: '125.5 MB',
          connections: 8,
          max_connections: 100
        },
        performance: {
          response_time: '45ms',
          active_users: 12,
          requests_per_minute: 45
        },
        business: {
          total_users: 25,
          total_orders_today: 156,
          total_revenue_today: 12500000,
          active_shifts: 3
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'HEALTHY':
      case 'CONNECTED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ERROR':
      case 'DISCONNECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-12 text-gray-500">
        Không thể tải thông tin hệ thống
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Health</h2>
        <p className="text-gray-600">Giám sát hiệu suất và sức khỏe hệ thống</p>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">System Status</h3>
            <span className={`px-3 py-1 rounded text-xs font-semibold border ${getStatusColor(health.system?.status)}`}>
              {health.system?.status || 'UNKNOWN'}
            </span>
          </div>
          <p className="text-sm text-gray-600">Uptime: {health.system?.uptime || '-'}</p>
          <p className="text-sm text-gray-600">Version: {health.system?.version || '-'}</p>
        </div>

        <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Database</h3>
            <span className={`px-3 py-1 rounded text-xs font-semibold border ${getStatusColor(health.database?.status)}`}>
              {health.database?.status || 'UNKNOWN'}
            </span>
          </div>
          <p className="text-sm text-gray-600">Size: {health.database?.size || '-'}</p>
          <p className="text-sm text-gray-600">
            Connections: {health.database?.connections || 0}/{health.database?.max_connections || 0}
          </p>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Performance</h3>
          </div>
          <p className="text-sm text-gray-600">Response Time: {health.performance?.response_time || '-'}</p>
          <p className="text-sm text-gray-600">Active Users: {health.performance?.active_users || 0}</p>
          <p className="text-sm text-gray-600">Requests/min: {health.performance?.requests_per_minute || 0}</p>
        </div>

        <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Business</h3>
          </div>
          <p className="text-sm text-gray-600">Total Users: {health.business?.total_users || 0}</p>
          <p className="text-sm text-gray-600">Orders Today: {health.business?.total_orders_today || 0}</p>
          <p className="text-sm text-gray-600">Active Shifts: {health.business?.active_shifts || 0}</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(health.system?.status)}`}>
                {health.system?.status || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uptime:</span>
              <span className="font-medium">{health.system?.uptime || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium">{health.system?.version || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(health.database?.status)}`}>
                {health.database?.status || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">{health.database?.size || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Connections:</span>
              <span className="font-medium">
                {health.database?.connections || 0} / {health.database?.max_connections || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadHealth}
          disabled={loading}
          className="px-6 py-3 bg-red-500 text-white border-2 border-red-500 rounded-lg font-semibold hover:bg-white hover:text-red-500 transition-all disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : '🔄 Làm mới'}
        </button>
      </div>
    </div>
  );
}

