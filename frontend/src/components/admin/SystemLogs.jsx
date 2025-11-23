// src/components/admin/SystemLogs.jsx
import { useState, useEffect } from 'react';
import { api } from '../../api.js';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    level: 'ALL',
    search: '',
    limit: 100
  });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.level !== 'ALL') params.append('level', filters.level);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', filters.limit);
      
      const response = await api.getSystemLogs({
        level: filters.level !== 'ALL' ? filters.level : undefined,
        search: filters.search || undefined,
        limit: filters.limit
      });
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      // Mock data for now
      setLogs([
        {
          id: 1,
          timestamp: new Date().toISOString(),
          level: 'INFO',
          user: 'admin',
          action: 'LOGIN',
          message: 'User logged in successfully',
          ip_address: '192.168.1.1'
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          level: 'WARN',
          user: 'cashier1',
          action: 'ORDER_CREATE',
          message: 'Order created with low stock items',
          ip_address: '192.168.1.2'
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          level: 'ERROR',
          user: null,
          action: 'SYSTEM',
          message: 'Database connection timeout',
          ip_address: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'bg-red-100 text-red-800 border-red-300';
      case 'WARN': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">System Logs</h2>
        <p className="text-gray-600">Xem logs hệ thống và các hoạt động quan trọng</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Tìm kiếm..."
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số lượng
            </label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Không có logs nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thời gian</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.user || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.action || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

