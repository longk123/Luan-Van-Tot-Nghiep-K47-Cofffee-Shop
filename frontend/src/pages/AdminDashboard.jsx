// src/pages/AdminDashboard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthedLayout from '../layouts/AuthedLayout.jsx';
import { getUser } from '../auth.js';
import SystemSettings from '../components/admin/SystemSettings.jsx';
import SystemLogs from '../components/admin/SystemLogs.jsx';
import SystemHealth from '../components/admin/SystemHealth.jsx';
// Import Manager Dashboard để reuse toàn bộ logic
import ManagerDashboard from './ManagerDashboard.jsx';
// Import icons từ lucide-react
import { 
  Shield, 
  BarChart3, 
  Settings, 
  FileText, 
  HeartPulse, 
  Users, 
  UtensilsCrossed, 
  Package,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const user = getUser();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.some(role => role.toLowerCase() === 'admin');

  // Redirect if not admin
  React.useEffect(() => {
    if (!isAdmin) {
      navigate('/manager', { replace: true });
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) {
    return null;
  }

  const tabs = [
    { 
      id: 'manager', 
      label: 'Manager Dashboard', 
      icon: <BarChart3 className="w-5 h-5" />
    },
    { 
      id: 'settings', 
      label: 'Cấu hình hệ thống', 
      icon: <Settings className="w-5 h-5" />
    },
    { 
      id: 'logs', 
      label: 'System Logs', 
      icon: <FileText className="w-5 h-5" />
    },
    { 
      id: 'health', 
      label: 'System Health', 
      icon: <HeartPulse className="w-5 h-5" />
    },
  ];

  return (
    <AuthedLayout>
      <div className="pb-32">
        {/* Header - Đơn giản, không gradient chói */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#c9975b] rounded-xl flex items-center justify-center shadow-md">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">Quản trị hệ thống</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Đơn giản với invert hover */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'bg-[#c9975b] text-white border-[#c9975b]'
                    : 'text-gray-600 border-transparent hover:bg-[#c9975b] hover:text-white hover:border-[#c9975b]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'manager' && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Admin Mode:</strong> Bạn đang xem Manager Dashboard với quyền Admin. 
                  Tất cả tính năng của Manager đều có sẵn, cộng thêm các tính năng Admin ở các tab khác.
                </p>
              </div>
              <ManagerDashboard embedded={true} />
            </div>
          )}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'logs' && <SystemLogs />}
          {activeTab === 'health' && <SystemHealth />}
        </div>
      </div>
    </AuthedLayout>
  );
}

// Admin Overview Component
function AdminOverview() {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Quản lý nhân viên',
      description: 'Xem và quản lý tất cả nhân viên',
      icon: <Users className="w-8 h-8" />,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-white hover:text-blue-500',
      borderColor: 'border-blue-500',
      onClick: () => navigate('/employees')
    },
    {
      title: 'Manager Dashboard',
      description: 'Xem báo cáo và thống kê',
      icon: <BarChart3 className="w-8 h-8" />,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-white hover:text-purple-500',
      borderColor: 'border-purple-500',
      onClick: () => navigate('/manager')
    },
    {
      title: 'Quản lý menu',
      description: 'Quản lý thực đơn và sản phẩm',
      icon: <UtensilsCrossed className="w-8 h-8" />,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-white hover:text-green-500',
      borderColor: 'border-green-500',
      onClick: () => navigate('/menu-management')
    },
    {
      title: 'Quản lý kho',
      description: 'Quản lý nguyên liệu và tồn kho',
      icon: <Package className="w-8 h-8" />,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-white hover:text-orange-500',
      borderColor: 'border-orange-500',
      onClick: () => navigate('/inventory')
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tổng quan hệ thống</h2>
        <p className="text-gray-600 mb-6">
          Chào mừng đến với Admin Dashboard. Tại đây bạn có thể quản lý toàn bộ hệ thống.
        </p>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Truy cập nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`group ${action.color} ${action.hoverColor} text-white border-2 ${action.borderColor} rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-left relative overflow-hidden`}
            >
              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="mb-3 group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>
                <h4 className="font-bold text-lg mb-1">{action.title}</h4>
                <p className="text-white/90 text-sm">{action.description}</p>
                <ArrowRight className="w-4 h-4 mt-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Admin Features */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Chức năng Admin</h3>
        <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 border border-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <Settings className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Cấu hình hệ thống</h4>
              </div>
              <p className="text-sm text-gray-600">
                Cấu hình thông tin cửa hàng, giờ mở cửa, và các thiết lập hệ thống
              </p>
            </div>
            <div className="group bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 border border-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900">System Logs</h4>
              </div>
              <p className="text-sm text-gray-600">
                Xem logs hệ thống, lỗi, và các hoạt động quan trọng
              </p>
            </div>
            <div className="group bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 border border-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <HeartPulse className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900">System Health</h4>
              </div>
              <p className="text-sm text-gray-600">
                Giám sát hiệu suất và sức khỏe hệ thống
              </p>
            </div>
            <div className="group bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 border border-transparent">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Quản lý User</h4>
              </div>
              <p className="text-sm text-gray-600">
                Gán role Manager/Admin cho nhân viên
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

