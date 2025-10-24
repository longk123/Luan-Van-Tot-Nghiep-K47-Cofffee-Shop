import { useState } from 'react';
import { getUser } from '../auth.js';

export default function UserBadge() {
  const [showDropdown, setShowDropdown] = useState(false);
  const user = getUser();

  if (!user) return null;

  const userRoles = user?.roles || [];
  const isKitchenStaff = userRoles.some(role => 
    ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
  );
  const isCashier = userRoles.some(role => 
    ['cashier', 'staff', 'employee'].includes(role.toLowerCase())
  );

  // Xác định role chính
  const getPrimaryRole = () => {
    if (isKitchenStaff) return 'Pha chế';
    if (isCashier) return 'Thu ngân';
    return 'Nhân viên';
  };

  const getRoleColor = () => {
    if (isKitchenStaff) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (isCashier) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = () => {
    if (isKitchenStaff) return '🍳';
    if (isCashier) return '💰';
    return '👤';
  };

  return (
    <div className="relative">
      {/* Badge trigger */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 hover:bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
          {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        
        {/* User info - simplified */}
        <div className="text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.full_name || user.username || 'User'}
          </div>
          <div className="text-xs text-gray-500">
            {getRoleIcon()} {getPrimaryRole()}
          </div>
        </div>

        {/* Dropdown arrow */}
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user.full_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {user.full_name || user.username || 'User'}
                </div>
                <div className="text-sm text-gray-500">
                  {user.email || 'No email'}
                </div>
              </div>
            </div>
          </div>

          {/* Roles */}
          <div className="px-4 py-2">
            <div className="text-xs font-medium text-gray-500 mb-2">Vai trò:</div>
            <div className="flex flex-wrap gap-1">
              {userRoles.map((role, index) => (
                <span 
                  key={index}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-2 py-1">
            <button
              onClick={() => {
                // Logout functionality
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
