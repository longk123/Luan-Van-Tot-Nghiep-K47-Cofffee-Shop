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
    if (isKitchenStaff) return {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      badge: 'bg-orange-100 text-orange-800'
    };
    if (isCashier) return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800'
    };
    return {
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-800'
    };
  };

  const getRoleIcon = () => {
    if (isKitchenStaff) return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    );
    if (isCashier) return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  };

  const roleColors = getRoleColor();
  const getInitials = () => {
    const name = user.full_name || user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative">
      {/* Badge trigger - ENHANCED */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-2xl border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-xl transition-all duration-200 outline-none focus:outline-none group"
      >
        {/* Avatar with gradient and glow effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#c9975b] to-[#8B6F47] rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity"></div>
          <div className="relative w-10 h-10 bg-gradient-to-br from-[#c9975b] via-[#a8824f] to-[#8B6F47] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
            {getInitials()}
          </div>
          {/* Online indicator with pulse */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-lg"></div>
        </div>
        
        {/* User info */}
        <div className="text-left flex-1">
          <div className="text-sm font-bold text-gray-900 leading-tight group-hover:text-[#c9975b] transition-colors">
            {user.full_name || user.username || 'User'}
          </div>
          <div className={`flex items-center gap-1.5 mt-0.5 text-xs font-semibold ${roleColors.text}`}>
            {getRoleIcon()}
            <span>{getPrimaryRole()}</span>
          </div>
        </div>

        {/* Dropdown arrow */}
        <svg 
          className={`w-5 h-5 text-gray-400 group-hover:text-[#c9975b] transition-all duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 overflow-hidden">
            {/* User info header with gradient background */}
            <div className={`px-4 py-4 ${roleColors.bg} border-b ${roleColors.border}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c9975b] to-[#8B6F47] rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {getInitials()}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {user.full_name || user.username || 'User'}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                    {user.email || user.username}
                  </div>
                </div>
              </div>
            </div>

            {/* Role badge */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-2">Vai trò hiện tại</div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${roleColors.badge} rounded-lg font-medium text-sm`}>
                {getRoleIcon()}
                <span>{getPrimaryRole()}</span>
              </div>
            </div>

            {/* All Roles */}
            {userRoles.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-500 mb-2">Tất cả quyền</div>
                <div className="flex flex-wrap gap-1.5">
                  {userRoles.map((role, index) => (
                    <span 
                      key={index}
                      className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Logout button */}
            <div className="px-2 py-2">
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
