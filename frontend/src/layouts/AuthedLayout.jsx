// === src/layouts/AuthedLayout.jsx ===
import { getToken } from '../auth.js';
import { Navigate } from 'react-router-dom';
import UserBadge from '../components/UserBadge.jsx';
import ShiftBadge from '../components/ShiftBadge.jsx';

export default function AuthedLayout({ children, shift }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-[#FBEAD0] to-[#FFF8ED] backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">☕</span>
            <div className="flex flex-col">
              <h1 className="font-semibold flex items-baseline gap-1">
                <span style={{ color: '#A07B4A' }}>POS</span>
                <span style={{ color: '#363636' }}>cà phê</span>
              </h1>
              <p className="text-sm" style={{ color: '#6B6B6B' }}>Hệ thống quản lý cà phê</p>
            </div>
          </div>
          
          {/* User Badge only - Shift info moved to main content */}
          <div className="flex items-center gap-3">
            <UserBadge />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
