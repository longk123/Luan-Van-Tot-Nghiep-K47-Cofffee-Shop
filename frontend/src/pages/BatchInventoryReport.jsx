// src/pages/BatchInventoryReport.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';

export default function BatchInventoryReport() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    ingredientId: '',
    status: '',
    daysThreshold: ''
  });
  
  useEffect(() => {
    loadIngredients();
    loadReport();
  }, []);
  
  const loadIngredients = async () => {
    try {
      const res = await api.getIngredients();
      setIngredients(res.data || []);
    } catch (error) {
      console.error('Error loading ingredients:', error);
    }
  };
  
  const loadReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.ingredientId) params.ingredientId = filters.ingredientId;
      if (filters.status) params.status = filters.status;
      if (filters.daysThreshold) params.daysThreshold = filters.daysThreshold;
      
      const res = await api.getBatchInventoryReport(params);
      setReportData(res.data || []);
      setSummary(res.summary || null);
    } catch (error) {
      console.error('Error loading report:', error);
      alert(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const handleApplyFilters = () => {
    loadReport();
  };
  
  const handleResetFilters = () => {
    setFilters({
      ingredientId: '',
      status: '',
      daysThreshold: ''
    });
    setTimeout(() => loadReport(), 100);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Hoạt động</span>,
      EXPIRED: <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Hết hạn</span>,
      DEPLETED: <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">Hết hàng</span>,
      BLOCKED: <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Bị khóa</span>
    };
    return badges[status] || status;
  };
  
  const exportToCSV = () => {
    const headers = ['Mã lô', 'Nguyên liệu', 'Nhập', 'Tồn', 'Xuất', '% Còn', 'Đơn vị', 'Đơn giá', 'Giá trị', 'Ngày nhập', 'HSD', 'Còn (ngày)', 'Trạng thái', 'NCC'];
    const rows = reportData.map(r => [
      r.batchCode,
      r.ingredientName,
      r.quantityImported,
      r.quantityRemaining,
      r.quantityExported,
      r.percentageRemaining,
      r.unit,
      r.unitPrice,
      r.totalValue,
      formatDate(r.importDate),
      formatDate(r.expiryDate),
      r.daysRemaining || '-',
      r.status,
      r.supplier || '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `batch-inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };
  
  return (
    <AuthedLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/manager')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Báo cáo Batch Inventory
              </h1>
              <p className="text-gray-600 mt-1">Báo cáo chi tiết tồn kho theo lô hàng</p>
            </div>
            
            <button
              onClick={exportToCSV}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xuất CSV
            </button>
          </div>
        </div>
        
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">Tổng batch</p>
              <p className="text-2xl font-bold text-gray-800">{summary.totalBatches}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">Tổng giá trị</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.totalValue)}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-600 mb-1">Batch hoạt động</p>
              <p className="text-2xl font-bold text-green-600">{summary.byStatus.ACTIVE}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">Batch hết hạn</p>
              <p className="text-2xl font-bold text-red-600">{summary.byStatus.EXPIRED}</p>
            </div>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bộ lọc</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nguyên liệu</label>
              <select
                value={filters.ingredientId}
                onChange={(e) => handleFilterChange('ingredientId', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả</option>
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.ten}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="EXPIRED">Hết hạn</option>
                <option value="DEPLETED">Hết hàng</option>
                <option value="BLOCKED">Bị khóa</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hết hạn trong</label>
              <select
                value={filters.daysThreshold}
                onChange={(e) => handleFilterChange('daysThreshold', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả</option>
                <option value="7">7 ngày</option>
                <option value="14">14 ngày</option>
                <option value="30">30 ngày</option>
                <option value="60">60 ngày</option>
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Áp dụng
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        
        {/* Report Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Chi tiết batch ({reportData.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Không có dữ liệu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã lô</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nguyên liệu</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nhập</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tồn</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Còn</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Giá trị</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSD</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {batch.batchCode}
                        </span>
                      </td>
                      <td className="px-4 py-3">{batch.ingredientName}</td>
                      <td className="px-4 py-3 text-right">{batch.quantityImported.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{batch.quantityRemaining.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${
                          batch.percentageRemaining >= 75 ? 'text-green-600' :
                          batch.percentageRemaining >= 50 ? 'text-yellow-600' :
                          batch.percentageRemaining >= 25 ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {batch.percentageRemaining.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(batch.totalValue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(batch.expiryDate)}
                        {batch.daysRemaining !== null && (
                          <span className={`ml-2 text-xs ${
                            batch.daysRemaining < 0 ? 'text-red-600' :
                            batch.daysRemaining <= 7 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            ({batch.daysRemaining < 0 ? 'Quá hạn' : `${batch.daysRemaining} ngày`})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(batch.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthedLayout>
  );
}

