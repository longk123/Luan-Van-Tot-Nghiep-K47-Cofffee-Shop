// src/pages/InventoryManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';

export default function InventoryManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stock'); // stock | export | import | warnings
  const [loading, setLoading] = useState(false);
  
  // Stock data
  const [ingredients, setIngredients] = useState([]);
  const [searchStock, setSearchStock] = useState('');
  
  // Export history
  const [exportHistory, setExportHistory] = useState([]);
  const [searchExport, setSearchExport] = useState('');
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  
  // Import history
  const [importHistory, setImportHistory] = useState([]);
  const [searchImport, setSearchImport] = useState('');
  const [importDateFrom, setImportDateFrom] = useState('');
  const [importDateTo, setImportDateTo] = useState('');
  
  // Warnings
  const [warnings, setWarnings] = useState([]);
  const [warningsSummary, setWarningsSummary] = useState({ total: 0, critical: 0, warning: 0, ok: 0 });
  
  // Import form
  const [showImportForm, setShowImportForm] = useState(false);
  const [importForm, setImportForm] = useState({
    ingredientId: '',
    quantity: '',
    price: '',
    supplier: '',
    note: ''
  });

  // Load data when tab changes
  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Load ingredients for import form
  useEffect(() => {
    const loadIngredientsForForm = async () => {
      if (showImportForm && ingredients.length === 0) {
        try {
          await loadIngredients();
        } catch (error) {
          console.error('Error loading ingredients for form:', error);
        }
      }
    };
    loadIngredientsForForm();
  }, [showImportForm]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        await loadIngredients();
      } else if (activeTab === 'export') {
        await loadExportHistory();
      } else if (activeTab === 'import') {
        await loadImportHistory();
      } else if (activeTab === 'warnings') {
        await loadWarnings();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = async () => {
    const res = await api.get('/inventory/ingredients');
    console.log('📦 Ingredients API response:', res);
    const data = res?.data || res || [];
    console.log('📦 Ingredients data:', data);
    setIngredients(data);
  };

  const loadExportHistory = async () => {
    const params = new URLSearchParams();
    if (exportDateFrom) params.set('from_date', exportDateFrom);
    if (exportDateTo) params.set('to_date', exportDateTo);
    params.set('limit', '200');
    
    const res = await api.get(`/inventory/export-history?${params.toString()}`);
    setExportHistory(res?.data || []);
  };

  const loadImportHistory = async () => {
    const params = new URLSearchParams();
    if (importDateFrom) params.set('from_date', importDateFrom);
    if (importDateTo) params.set('to_date', importDateTo);
    params.set('limit', '200');
    
    const res = await api.get(`/inventory/import-history?${params.toString()}`);
    setImportHistory(res?.data || []);
  };

  const handlePrintImportReceipt = async (importId) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      // Fetch PDF with token
      const response = await fetch(`/api/v1/phieu-nhap/${importId}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }

      // Create blob and open in new tab
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up the URL object after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error printing import receipt:', error);
      alert('Lỗi khi in phiếu nhập. Vui lòng thử lại.');
    }
  };

  const loadWarnings = async () => {
    const res = await api.get('/inventory/warnings');
    setWarnings(res?.warnings || []);
    setWarningsSummary(res?.summary || { total: 0, critical: 0, warning: 0, ok: 0 });
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.importInventory({
        nguyen_lieu_id: parseInt(importForm.ingredientId),
        so_luong: parseFloat(importForm.quantity),
        don_gia: parseFloat(importForm.price),
        nha_cung_cap: importForm.supplier,
        ghi_chu: importForm.note
      });
      
      setShowImportForm(false);
      setImportForm({ ingredientId: '', quantity: '', price: '', supplier: '', note: '' });
      loadImportHistory();
      loadIngredients(); // Reload để cập nhật tồn kho
      alert('✅ Nhập kho thành công!');
    } catch (error) {
      alert(`❌ Lỗi: ${error.message}`);
    }
  };

  // Filtered data
  const filteredStock = useMemo(() => {
    if (!searchStock) return ingredients;
    const term = searchStock.toLowerCase();
    return ingredients.filter(i => 
      (i.name || i.ten)?.toLowerCase().includes(term) || 
      (i.code || i.ma)?.toLowerCase().includes(term)
    );
  }, [ingredients, searchStock]);

  const filteredExport = useMemo(() => {
    if (!searchExport) return exportHistory;
    const term = searchExport.toLowerCase();
    return exportHistory.filter(e => 
      e.ingredient?.toLowerCase().includes(term) || 
      e.code?.toLowerCase().includes(term) ||
      e.orderId?.toString().includes(term)
    );
  }, [exportHistory, searchExport]);

  const filteredImport = useMemo(() => {
    if (!searchImport) return importHistory;
    const term = searchImport.toLowerCase();
    return importHistory.filter(i => 
      i.ingredient?.toLowerCase().includes(term) || 
      i.code?.toLowerCase().includes(term) ||
      i.supplier?.toLowerCase().includes(term)
    );
  }, [importHistory, searchImport]);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'HET_HANG') {
      return (
        <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          HẾT HÀNG
        </span>
      );
    } else if (status === 'SAP_HET') {
      return (
        <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          SẮP HẾT
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          ĐỦ
        </span>
      );
    }
  };

  return (
    <AuthedLayout
      pageName="Quản lý Kho"
      backUrl="/manager"
    >
      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          {/* Left: Title and Description */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#d4a574] to-[#c9975b] rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Kho</h1>
              <p className="text-sm text-gray-500 mt-0.5">Theo dõi nguyên liệu, lịch sử xuất nhập kho</p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => navigate('/manager')}
              className="px-4 py-2.5 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Quay lại Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'stock', name: 'Tồn kho', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )},
            { id: 'warnings', name: 'Cảnh báo', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )},
            { id: 'export', name: 'Lịch sử xuất', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            )},
            { id: 'import', name: 'Lịch sử nhập', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            )}
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gradient-to-r hover:from-[#f5e6d3] hover:via-[#f0ddc4] hover:to-[#f5e6d3] hover:text-[#c9975b]'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
              {tab.id === 'warnings' && warningsSummary.critical > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {warningsSummary.critical}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9975b]"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
          ) : (
            <>
              {/* Stock Tab */}
              {activeTab === 'stock' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Danh sách nguyên liệu</h2>
                    <div className="flex gap-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Tìm kiếm..."
                          value={searchStock}
                          onChange={(e) => setSearchStock(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={loadIngredients}
                        className="px-4 py-2 bg-gradient-to-r from-[#d4a574] to-[#c9975b] text-white rounded-lg hover:from-[#c9975b] hover:to-[#b8864a] transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Làm mới
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên nguyên liệu</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tồn kho</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Đơn vị</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá nhập</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá trị tồn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStock.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.code || item.ma}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name || item.ten}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                              {(item.stock || item.ton_kho)?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.unit || item.don_vi}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              {formatCurrency(item.price || item.gia_nhap_moi_nhat)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(item.value || item.gia_tri_ton_kho)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredStock.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Không có dữ liệu
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings Tab */}
              {activeTab === 'warnings' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Cảnh báo tồn kho</h2>
                    <button
                      onClick={loadWarnings}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Làm mới
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
                      <div className="text-sm text-gray-600">Tổng số</div>
                      <div className="text-2xl font-bold text-gray-800">{warningsSummary.total}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                      <div className="text-sm text-red-600">Hết hàng</div>
                      <div className="text-2xl font-bold text-red-700">{warningsSummary.critical}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                      <div className="text-sm text-yellow-600">Sắp hết</div>
                      <div className="text-2xl font-bold text-yellow-700">{warningsSummary.warning}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                      <div className="text-sm text-green-600">Đủ hàng</div>
                      <div className="text-2xl font-bold text-green-700">{warningsSummary.ok}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mã</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên nguyên liệu</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tồn kho</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Làm được (ly)</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá trị</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warnings.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.code}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={item.status === 'HET_HANG' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                                {item.stock} {item.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              {item.canMake !== null ? `~${item.canMake} ly` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(item.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Export History Tab */}
              {activeTab === 'export' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Lịch sử xuất kho</h2>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={exportDateFrom}
                        onChange={(e) => setExportDateFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={exportDateTo}
                        onChange={(e) => setExportDateTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={loadExportHistory}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                        </svg>
                        Lọc
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Tìm kiếm nguyên liệu, mã đơn..."
                        value={searchExport}
                        onChange={(e) => setSearchExport(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thời gian</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nguyên liệu</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Số lượng</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Đơn hàng</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Giá trị</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExport.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.exportDate)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.ingredient}
                              <div className="text-xs text-gray-500">{item.code}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">
                              -{item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.orderId && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  ĐH #{item.orderId}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              {formatCurrency(item.value)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredExport.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Không có dữ liệu xuất kho
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import History Tab */}
              {activeTab === 'import' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Lịch sử nhập kho</h2>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={importDateFrom}
                        onChange={(e) => setImportDateFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={importDateTo}
                        onChange={(e) => setImportDateTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        onClick={loadImportHistory}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                        </svg>
                        Lọc
                      </button>
                      <button
                        onClick={() => setShowImportForm(true)}
                        className="px-4 py-2 bg-gradient-to-r from-[#d4a574] to-[#c9975b] text-white rounded-lg hover:from-[#c9975b] hover:to-[#b8864a] font-medium transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nhập kho
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Tìm kiếm nguyên liệu, nhà cung cấp..."
                        value={searchImport}
                        onChange={(e) => setSearchImport(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Thời gian</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nguyên liệu</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Số lượng</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Đơn giá</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Thành tiền</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nhà cung cấp</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ghi chú</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredImport.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.importDate)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {item.ingredient}
                              <div className="text-xs text-gray-500">{item.code}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">
                              +{item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{item.supplier || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.note || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handlePrintImportReceipt(item.id)}
                                className="px-3 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded hover:from-purple-600 hover:to-purple-700 font-medium transition-all duration-200 flex items-center gap-1"
                                title="In phiếu nhập"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                In phiếu
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredImport.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Chưa có dữ liệu nhập kho
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Import Form Modal */}
      {showImportForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#d4a574] to-[#c9975b] rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Nhập kho mới</h3>
            </div>
            
            <form onSubmit={handleImportSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nguyên liệu *
                  </label>
                  <select
                    required
                    value={importForm.ingredientId}
                    onChange={(e) => setImportForm({ ...importForm, ingredientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn nguyên liệu --</option>
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name || ing.ten} ({ing.code || ing.ma})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={importForm.quantity}
                    onChange={(e) => setImportForm({ ...importForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn giá (VNĐ) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={importForm.price}
                    onChange={(e) => setImportForm({ ...importForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: 50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhà cung cấp
                  </label>
                  <input
                    type="text"
                    value={importForm.supplier}
                    onChange={(e) => setImportForm({ ...importForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: Công ty TNHH ABC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ghi chú
                  </label>
                  <textarea
                    value={importForm.note}
                    onChange={(e) => setImportForm({ ...importForm, note: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Ghi chú thêm..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowImportForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#d4a574] to-[#c9975b] text-white rounded-lg hover:from-[#c9975b] hover:to-[#b8864a] font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Xác nhận nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthedLayout>
  );
}
