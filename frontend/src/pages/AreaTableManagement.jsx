import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AuthedLayout from '../layouts/AuthedLayout.jsx';

export default function AreaTableManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [areas, setAreas] = useState([]);
  const [tables, setTables] = useState([]);
  const [activeTab, setActiveTab] = useState('areas'); // 'areas' | 'tables'
  
  // Area modal state
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm, setAreaForm] = useState({ ten: '', mo_ta: '', thu_tu: 0, active: true });
  
  // Table modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableForm, setTableForm] = useState({ ten_ban: '', khu_vuc_id: '', suc_chua: 4, ghi_chu: '' });
  
  // Filter state
  const [filterArea, setFilterArea] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [areasRes, tablesRes] = await Promise.all([
        api.getAreas(true),
        api.getTables()
      ]);
      setAreas(areasRes.data || []);
      setTables(tablesRes.data || tablesRes || []);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ===== AREA HANDLERS =====
  const handleCreateArea = () => {
    setEditingArea(null);
    setAreaForm({ ten: '', mo_ta: '', thu_tu: areas.length, active: true });
    setShowAreaModal(true);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setAreaForm({ ten: area.ten, mo_ta: area.mo_ta || '', thu_tu: area.thu_tu, active: area.active });
    setShowAreaModal(true);
  };

  const handleSaveArea = async () => {
    try {
      if (!areaForm.ten.trim()) {
        alert('Vui lòng nhập tên khu vực');
        return;
      }

      if (editingArea) {
        await api.updateArea(editingArea.id, areaForm);
      } else {
        await api.createArea(areaForm);
      }

      setShowAreaModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving area:', error);
      alert('Không thể lưu khu vực. Vui lòng thử lại.');
    }
  };

  const handleDeleteArea = async (area) => {
    if (!confirm(`Bạn có chắc muốn xóa khu vực "${area.ten}"?\n\nLưu ý: Các bàn trong khu vực này sẽ không bị xóa.`)) {
      return;
    }

    try {
      await api.deleteArea(area.id);
      loadData();
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('Không thể xóa khu vực. Vui lòng thử lại.');
    }
  };

  // ===== TABLE HANDLERS =====
  const handleCreateTable = () => {
    setEditingTable(null);
    setTableForm({ 
      ten_ban: '', 
      khu_vuc_id: areas[0]?.id || '', 
      suc_chua: 4, 
      ghi_chu: '' 
    });
    setShowTableModal(true);
  };

  const handleEditTable = (table) => {
    setEditingTable(table);
    setTableForm({ 
      ten_ban: table.ten_ban, 
      khu_vuc_id: table.khu_vuc_id || table.khu_vuc, 
      suc_chua: table.suc_chua, 
      ghi_chu: table.ghi_chu || '' 
    });
    setShowTableModal(true);
  };

  const handleSaveTable = async () => {
    try {
      if (!tableForm.ten_ban.trim()) {
        alert('Vui lòng nhập tên bàn');
        return;
      }
      if (!tableForm.khu_vuc_id) {
        alert('Vui lòng chọn khu vực');
        return;
      }

      const payload = {
        ten_ban: tableForm.ten_ban,
        khu_vuc: parseInt(tableForm.khu_vuc_id),
        suc_chua: parseInt(tableForm.suc_chua),
        ghi_chu: tableForm.ghi_chu || null
      };

      if (editingTable) {
        await api.updateTable(editingTable.id, payload);
      } else {
        await api.createTable(payload);
      }

      setShowTableModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Không thể lưu bàn. Vui lòng thử lại.');
    }
  };

  const handleDeleteTable = async (table) => {
    if (!confirm(`Bạn có chắc muốn xóa bàn "${table.ten_ban}"?`)) {
      return;
    }

    try {
      await api.deleteTable(table.id);
      loadData();
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Không thể xóa bàn. Vui lòng thử lại.');
    }
  };

  // ===== FILTERS =====
  const filteredTables = tables.filter(table => {
    if (filterArea && table.khu_vuc_id !== parseInt(filterArea) && table.khu_vuc !== parseInt(filterArea)) {
      return false;
    }
    if (searchQuery && !table.ten_ban.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getAreaName = (areaId) => {
    const area = areas.find(a => a.id === areaId);
    return area?.ten || 'N/A';
  };

  return (
    <AuthedLayout>
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Khu vực & Bàn</h1>
              <p className="text-sm text-gray-500 mt-0.5">{areas.length} khu vực • {tables.length} bàn</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/manager')}
            className="px-4 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white border-2 border-gray-500 rounded-full hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-gray-600 hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2.5 shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Quay lại</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('areas')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'areas'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
            <span>Khu vực ({areas.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`flex-1 px-6 py-4 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
              activeTab === 'tables'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Bàn ({tables.length})</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Đang tải dữ liệu...</p>
        </div>
      ) : activeTab === 'areas' ? (
        <AreasTab
          areas={areas}
          onCreateArea={handleCreateArea}
          onEditArea={handleEditArea}
          onDeleteArea={handleDeleteArea}
        />
      ) : (
        <TablesTab
          tables={filteredTables}
          areas={areas}
          filterArea={filterArea}
          setFilterArea={setFilterArea}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCreateTable={handleCreateTable}
          onEditTable={handleEditTable}
          onDeleteTable={handleDeleteTable}
          getAreaName={getAreaName}
        />
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <AreaModal
          area={editingArea}
          form={areaForm}
          setForm={setAreaForm}
          onSave={handleSaveArea}
          onClose={() => setShowAreaModal(false)}
        />
      )}

      {/* Table Modal */}
      {showTableModal && (
        <TableModal
          table={editingTable}
          form={tableForm}
          setForm={setTableForm}
          areas={areas}
          onSave={handleSaveTable}
          onClose={() => setShowTableModal(false)}
        />
      )}
    </AuthedLayout>
  );
}

// ===== AREAS TAB COMPONENT =====
function AreasTab({ areas, onCreateArea, onEditArea, onDeleteArea }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Danh sách khu vực</h2>
        <button
          onClick={onCreateArea}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Thêm khu vực</span>
        </button>
      </div>

      {areas.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
          </svg>
          <p className="text-gray-500">Chưa có khu vực nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              onEdit={() => onEditArea(area)}
              onDelete={() => onDeleteArea(area)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== AREA CARD COMPONENT =====
function AreaCard({ area, onEdit, onDelete }) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 p-5 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{area.ten}</h3>
          {area.mo_ta && <p className="text-sm text-gray-600 mb-2">{area.mo_ta}</p>}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {area.total_tables || 0} bàn
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
              Thứ tự: {area.thu_tu}
            </span>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${area.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {area.active ? 'Hoạt động' : 'Tắt'}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 bg-white text-purple-600 border-2 border-purple-300 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Sửa
        </button>
        <button
          onClick={onDelete}
          className="flex-1 px-3 py-2 bg-white text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Xóa
        </button>
      </div>
    </div>
  );
}

// ===== TABLES TAB COMPONENT =====
function TablesTab({ tables, areas, filterArea, setFilterArea, searchQuery, setSearchQuery, onCreateTable, onEditTable, onDeleteTable, getAreaName }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Danh sách bàn</h2>
        <button
          onClick={onCreateTable}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full hover:shadow-lg transition-all duration-200 font-semibold flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Thêm bàn</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên bàn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
        >
          <option value="">Tất cả khu vực</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>{area.ten}</option>
          ))}
        </select>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-gray-500">Không tìm thấy bàn nào</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tên bàn</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Khu vực</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sức chứa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ghi chú</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => (
                <TableRow
                  key={table.id}
                  table={table}
                  getAreaName={getAreaName}
                  onEdit={() => onEditTable(table)}
                  onDelete={() => onDeleteTable(table)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== TABLE ROW COMPONENT =====
function TableRow({ table, getAreaName, onEdit, onDelete }) {
  const getStatusBadge = (status) => {
    const badges = {
      'TRONG': { bg: 'bg-green-100', text: 'text-green-700', label: 'Trống' },
      'DANG_DUNG': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang dùng' },
      'KHOA': { bg: 'bg-red-100', text: 'text-red-700', label: 'Khóa' },
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{table.ten_ban}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{getAreaName(table.khu_vuc_id || table.khu_vuc)}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{table.suc_chua} người</td>
      <td className="px-4 py-3 text-sm">{getStatusBadge(table.trang_thai)}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{table.ghi_chu || '-'}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex gap-2 justify-end">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all duration-200 font-semibold text-xs"
          >
            Sửa
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 font-semibold text-xs"
          >
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}

// ===== AREA MODAL COMPONENT =====
function AreaModal({ area, form, setForm, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold">{area ? 'Sửa khu vực' : 'Thêm khu vực mới'}</h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tên khu vực <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.ten}
              onChange={(e) => setForm({ ...form, ten: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="VD: Tầng 1, Khu VIP..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
            <textarea
              value={form.mo_ta}
              onChange={(e) => setForm({ ...form, mo_ta: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              rows={3}
              placeholder="Mô tả về khu vực..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Thứ tự hiển thị</label>
            <input
              type="number"
              value={form.thu_tu}
              onChange={(e) => setForm({ ...form, thu_tu: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              min="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="area-active"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="area-active" className="text-sm font-semibold text-gray-700">
              Khu vực đang hoạt động
            </label>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold"
          >
            {area ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== TABLE MODAL COMPONENT =====
function TableModal({ table, form, setForm, areas, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-t-2xl">
          <h3 className="text-xl font-bold">{table ? 'Sửa bàn' : 'Thêm bàn mới'}</h3>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tên bàn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.ten_ban}
              onChange={(e) => setForm({ ...form, ten_ban: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="VD: Bàn 1, A1, VIP-01..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Khu vực <span className="text-red-500">*</span>
            </label>
            <select
              value={form.khu_vuc_id}
              onChange={(e) => setForm({ ...form, khu_vuc_id: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
            >
              <option value="">-- Chọn khu vực --</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.ten}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sức chứa (người)</label>
            <input
              type="number"
              value={form.suc_chua}
              onChange={(e) => setForm({ ...form, suc_chua: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              min="1"
              max="20"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
            <textarea
              value={form.ghi_chu}
              onChange={(e) => setForm({ ...form, ghi_chu: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
              rows={2}
              placeholder="Ghi chú về bàn..."
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-all duration-200 font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold"
          >
            {table ? 'Cập nhật' : 'Tạo mới'}
          </button>
        </div>
      </div>
    </div>
  );
}

