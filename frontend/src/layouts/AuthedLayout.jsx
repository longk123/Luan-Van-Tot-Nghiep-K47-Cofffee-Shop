// === src/layouts/AuthedLayout.jsx ===
import { getToken } from '../auth.js';
import { Navigate } from 'react-router-dom';

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
          
          {/* Shift info */}
          <div className="flex items-center gap-3">
            {shift && shift.status === 'OPEN' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                👤 {shift.nhan_vien?.full_name || 'Nhân viên'} •
                🟢 Ca #{shift.id} - {shift.started_at ? new Date(shift.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
                ⚠️ Chưa mở ca
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
