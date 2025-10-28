// === src/layouts/AuthedLayout.jsx ===
import { getToken } from '../auth.js';
import { Navigate, useNavigate } from 'react-router-dom';
import UserBadge from '../components/UserBadge.jsx';
import ShiftBadge from '../components/ShiftBadge.jsx';

export default function AuthedLayout({ children, shift, isManagerViewMode = false, pageName = 'Dashboard', backUrl = '/manager' }) {
  const token = getToken();
  const navigate = useNavigate();
  console.log('🔍 AuthedLayout - Token:', token ? 'exists' : 'missing');

  if (!token) {
    console.log('❌ AuthedLayout - No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 text-gray-900">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 shadow-lg border-b border-gray-200/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo with enhanced glow effect */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9975b] to-[#8B6F47] rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-[#c9975b] via-[#a8824f] to-[#8B6F47] rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-105 transition-transform">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              {/* Brand text with enhanced styling */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-[#c9975b] via-[#a8824f] to-[#8B6F47] bg-clip-text text-transparent">POS</span>
                  <span className="text-gray-800"> Cà Phê</span>
                </h1>
                <p className="text-xs text-gray-600 font-semibold flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Hệ thống quản lý chuyên nghiệp
                </p>
              </div>
            </div>

            {/* View Mode Indicator + User Badge */}
            <div className="flex items-center gap-3">
              {/* View Mode Badge - chỉ hiển thị khi Manager đang xem */}
              {isManagerViewMode && (
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-800">Chế độ xem</span>
                    <span className="text-[10px] text-blue-600 font-medium">{pageName}</span>
                  </div>
                </div>
              )}

              <UserBadge />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
