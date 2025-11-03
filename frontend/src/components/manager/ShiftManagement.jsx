// src/components/manager/ShiftManagement.jsx
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../api.js';
import { getUser } from '../../auth.js';
import ShiftDetailModal from './ShiftDetailModal.jsx';

export default function ShiftManagement({ timeRange, customStartDate, customEndDate }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterType, setFilterType] = useState('CASHIER'); // CASHIER, KITCHEN (no ALL option)
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, OPEN, CLOSED
  const [filterEmployee, setFilterEmployee] = useState('ALL'); // ALL or user_id
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadShifts = async () => {
    setLoading(true);
    try {
      console.log('🔄 ShiftManagement - Loading shifts with params:', {
        timeRange,
        customStartDate,
        customEndDate
      });
      
      // Nếu có customStartDate và customEndDate, tính số ngày từ khoảng thời gian
      // Nếu không, mặc định 30 ngày
      let days = 30;
      
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const diffTime = Math.abs(end - start);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 để bao gồm cả ngày cuối
        console.log('📅 Calculated days from date range:', days);
      }

      const res = await api.getShiftStats(days);
      let allShifts = res?.data || res || [];
      console.log('📊 Total shifts from API:', allShifts.length);
      
      // Filter theo khoảng thời gian nếu có customStartDate và customEndDate
      if (customStartDate && customEndDate) {
        const startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        
        console.log('🔍 Filtering shifts from', startDate, 'to', endDate);
        
        allShifts = allShifts.filter(shift => {
          const shiftStart = new Date(shift.started_at);
          return shiftStart >= startDate && shiftStart <= endDate;
        });
        
        console.log('✅ Filtered shifts count:', allShifts.length);
      }
      
      setShifts(allShifts);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load danh sách nhân viên
  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await api.getUserList();
      const users = res?.data || res || [];
      setEmployees(users);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load employees khi component mount
  useEffect(() => {
    loadEmployees();
  }, []);

  // Reset filter nhân viên khi đổi loại ca
  useEffect(() => {
    setFilterEmployee('ALL');
  }, [filterType]);

  // Tự động reload khi timeRange, customStartDate hoặc customEndDate thay đổi
  useEffect(() => {
    console.log('🔄 ShiftManagement - useEffect triggered:', {
      timeRange,
      customStartDate,
      customEndDate
    });
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, customStartDate, customEndDate]);

  // Kiểm tra user hiện tại có phải admin không
  const currentUser = getUser();
  const isAdmin = currentUser?.roles?.some(role => 
    role.toLowerCase() === 'admin'
  ) || false;

  // Filter employees theo loại ca
  const filteredEmployees = useMemo(() => {
    if (isAdmin) {
      // Admin thấy tất cả
      return employees;
    }

    // Filter theo filterType
    return employees.filter(emp => {
      const roles = emp.roles || [];
      const roleNames = roles.map(r => 
        typeof r === 'object' ? r.role_name?.toLowerCase() : r?.toLowerCase()
      ).filter(Boolean);

      if (filterType === 'CASHIER') {
        // Chỉ hiển thị cashier
        return roleNames.some(role => 
          ['cashier', 'staff', 'employee'].includes(role)
        );
      } else if (filterType === 'KITCHEN') {
        // Chỉ hiển thị kitchen staff
        return roleNames.some(role => 
          ['kitchen', 'barista', 'chef', 'cook'].includes(role)
        );
      }

      return true;
    });
  }, [employees, filterType, isAdmin]);

  const handleViewDetail = async (shift) => {
    setSelectedShift(shift);
    setShowDetailModal(true);
  };

  // Filter shifts - NO "ALL" option for type
  const filteredShifts = shifts.filter(shift => {
    if (shift.type !== filterType) return false; // Always filter by type
    if (filterStatus !== 'ALL' && shift.status !== filterStatus) return false;
    if (filterEmployee !== 'ALL' && shift.nhan_vien_id !== parseInt(filterEmployee)) return false;
    return true;
  });

  // Tính tổng thống kê - Tách riêng cho CASHIER và KITCHEN
  const totalStats = filterType === 'CASHIER'
    ? filteredShifts.reduce((acc, shift) => ({
        total_orders: acc.total_orders + (shift.stats?.total_orders || 0),
        gross_amount: acc.gross_amount + (shift.stats?.gross_amount || 0),
        net_amount: acc.net_amount + (shift.stats?.net_amount || 0),
        cash_diff: acc.cash_diff + (shift.stats?.cash_diff || 0),
      }), { total_orders: 0, gross_amount: 0, net_amount: 0, cash_diff: 0 })
    : filteredShifts.reduce((acc, shift) => ({
        total_items_made: acc.total_items_made + (shift.stats?.total_items_made || 0),
        avg_prep_time_seconds: shift.stats?.avg_prep_time_seconds || acc.avg_prep_time_seconds,
      }), { total_items_made: 0, avg_prep_time_seconds: 0 });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'OPEN') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đang mở</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Đã đóng</span>;
  };

  const getTypeBadge = (type) => {
    if (type === 'CASHIER') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Thu ngân</span>;
    }
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Pha chế</span>;
  };

  return (
    <div className="pb-32">
      {/* Summary Cards - Different for CASHIER vs KITCHEN */}
      {filterType === 'CASHIER' ? (
        // CASHIER: Show orders, revenue, cash difference
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
            <div className="text-sm text-gray-600 mb-1">Tổng ca</div>
            <div className="text-2xl font-bold text-gray-800">{filteredShifts.length}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="text-sm text-blue-600 mb-1">Tổng đơn</div>
            <div className="text-2xl font-bold text-blue-700">{totalStats.total_orders}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
            <div className="text-sm text-green-600 mb-1">Doanh thu</div>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(totalStats.net_amount)}</div>
          </div>
          <div className={`rounded-lg p-4 border-l-4 ${
            totalStats.cash_diff >= 0 
              ? 'bg-green-50 border-green-500' 
              : 'bg-red-50 border-red-500'
          }`}>
            <div className={`text-sm mb-1 ${
              totalStats.cash_diff >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Chênh lệch tiền mặt
            </div>
            <div className={`text-2xl font-bold ${
              totalStats.cash_diff >= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {formatCurrency(totalStats.cash_diff)}
            </div>
          </div>
        </div>
      ) : (
        // KITCHEN: Show kitchen-specific metrics
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
            <div className="text-sm text-gray-600 mb-1">Tổng ca</div>
            <div className="text-2xl font-bold text-gray-800">{filteredShifts.length}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
            <div className="text-sm text-purple-600 mb-1">☕ Tổng món đã làm</div>
            <div className="text-2xl font-bold text-purple-700">{totalStats.total_items_made || 0}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="text-sm text-blue-600 mb-1">⏱️ Thời gian TB/món</div>
            <div className="text-2xl font-bold text-blue-700">
              {totalStats.avg_prep_time_seconds > 0
                ? `${Math.round(totalStats.avg_prep_time_seconds)}s`
                : '-'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại ca</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
            >
              <option value="CASHIER">Thu ngân</option>
              <option value="KITCHEN">Pha chế</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent"
            >
              <option value="ALL">Tất cả</option>
              <option value="OPEN">Đang mở</option>
              <option value="CLOSED">Đã đóng</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              disabled={loadingEmployees}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9975b] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed min-w-[180px]"
            >
              <option value="ALL">Tất cả</option>
              {filteredEmployees.map(emp => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.full_name || emp.username}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => loadShifts()}
              className="px-4 py-2 bg-gradient-to-r from-[#d4a574] to-[#c9975b] text-white border-2 border-[#c9975b] rounded-lg hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>
        {customStartDate && customEndDate && (
          <div className="mt-3 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg inline-flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Hiển thị ca từ {customStartDate} đến {customEndDate}</span>
          </div>
        )}
      </div>

      {/* Shifts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bắt đầu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kết thúc</th>
                {filterType === 'CASHIER' && (
                  <>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn hàng</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chênh lệch</th>
                  </>
                )}
                {filterType === 'KITCHEN' && (
                  <>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Món đã làm</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">TG trung bình</th>
                  </>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#c9975b] border-t-transparent"></div>
                      <span>Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <div className="text-lg font-medium mb-2">Không có ca làm việc nào</div>
                      <div className="text-sm">
                        {shifts.length === 0 ? (
                          <>
                            {customStartDate && customEndDate ? (
                              <>Không có ca làm việc nào trong khoảng thời gian từ {customStartDate} đến {customEndDate}. Vui lòng mở ca mới từ Dashboard.</>
                            ) : (
                              <>Chưa có ca làm việc nào trong 30 ngày gần đây. Vui lòng mở ca mới từ Dashboard.</>
                            )}
                          </>
                        ) : (
                          <>Không có ca nào phù hợp với bộ lọc hiện tại. Thử thay đổi bộ lọc.</>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{shift.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {typeof shift.staff === 'string' ? shift.staff : (shift.staff?.full_name || shift.staff?.username || '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(shift.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(shift.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(shift.closed_at)}
                    </td>
                    {filterType === 'CASHIER' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {shift.stats?.total_orders || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                          {formatCurrency(shift.stats?.net_amount || 0)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                          (shift.stats?.cash_diff || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(shift.stats?.cash_diff || 0)}
                        </td>
                      </>
                    )}
                    {filterType === 'KITCHEN' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {shift.stats?.total_items_made || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {shift.stats?.avg_prep_time_seconds ? `${Math.round(shift.stats.avg_prep_time_seconds / 60)}m` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button
                        onClick={() => handleViewDetail(shift)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedShift(null);
          }}
        />
      )}
    </div>
  );
}

