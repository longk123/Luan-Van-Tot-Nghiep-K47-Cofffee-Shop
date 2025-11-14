import { useState } from "react";
import { saveToken } from "../auth";
import { useNavigate } from "react-router-dom";

// SVG Icon Components
const CoffeeIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 9h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5V3a2 2 0 012-2h2a2 2 0 012 2v2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 13h8M8 17h8" />
  </svg>
);

const CashierIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const KitchenIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
  </svg>
);

const ManagerIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const AdminIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ROLES = [
  { key: "cashier", label: "Thu ngân", icon: CashierIcon },
  { key: "kitchen", label: "Pha chế / Bếp", icon: KitchenIcon },
  { key: "manager", label: "Quản lý", icon: ManagerIcon },
  { key: "admin",   label: "Quản trị viên", icon: AdminIcon },
];

// Màu riêng cho từng vai trò
const ROLE_COLORS = {
  cashier: {
    border: "border-blue-500",
    ring: "ring-blue-500",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    text: "text-blue-700",
    hoverBorder: "hover:border-blue-500",
    hoverBg: "group-hover:bg-blue-100",
    hoverText: "group-hover:text-blue-700",
    focusRing: "focus:ring-blue-500",
  },
  kitchen: {
    border: "border-accent-500",
    ring: "ring-accent-500",
    bg: "bg-accent-50",
    iconBg: "bg-accent-100",
    iconText: "text-accent-700",
    text: "text-accent-700",
    hoverBorder: "hover:border-accent-500",
    hoverBg: "group-hover:bg-accent-100",
    hoverText: "group-hover:text-accent-700",
    focusRing: "focus:ring-accent-500",
  },
  manager: {
    border: "border-primary-500",
    ring: "ring-primary-500",
    bg: "bg-primary-50",
    iconBg: "bg-primary-100",
    iconText: "text-primary-700",
    text: "text-primary-700",
    hoverBorder: "hover:border-primary-500",
    hoverBg: "group-hover:bg-primary-100",
    hoverText: "group-hover:text-primary-700",
    focusRing: "focus:ring-primary-500",
  },
  admin: {
    border: "border-purple-500",
    ring: "ring-purple-500",
    bg: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconText: "text-purple-700",
    text: "text-purple-700",
    hoverBorder: "hover:border-purple-500",
    hoverBg: "group-hover:bg-purple-100",
    hoverText: "group-hover:text-purple-700",
    focusRing: "focus:ring-purple-500",
  },
};

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedRole) {
      setError("Vui lòng chọn vai trò trước khi đăng nhập.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) throw new Error(data?.error || "Thiếu thông tin đăng nhập");
        if (res.status === 401) throw new Error(data?.error || "Sai tên đăng nhập hoặc mật khẩu");
        if (res.status === 403) throw new Error(data?.error || "Tài khoản đã bị khóa");
        if (res.status === 500) throw new Error("Lỗi máy chủ. Vui lòng thử lại sau.");
        throw new Error(data?.error || data?.message || "Đăng nhập thất bại");
      }

      const userRoles = (data?.user?.roles || []).map((r) => String(r).toLowerCase());
      if (!userRoles.includes(selectedRole)) {
        const roleLabel = ROLES.find(r => r.key === selectedRole)?.label || selectedRole;
        throw new Error(`Tài khoản không có quyền "${roleLabel}".`);
      }

      saveToken(data.token);
      
      // Auto-redirect theo role
      const originalUserRoles = data?.user?.roles || [];
      console.log('🔍 Login - User roles from API:', originalUserRoles);
      
      const isKitchenStaff = originalUserRoles.some(role => 
        ['kitchen', 'barista', 'chef', 'cook'].includes(role.toLowerCase())
      );
      const isManager = originalUserRoles.some(role => 
        ['manager', 'admin'].includes(role.toLowerCase())
      );
      
      console.log('🔍 Login - isKitchenStaff:', isKitchenStaff);
      console.log('🔍 Login - isManager:', isManager);
      
      // Kiểm tra xem có payment result pending không
      const paymentResult = localStorage.getItem('payos_payment_result');
      if (paymentResult) {
        try {
          const result = JSON.parse(paymentResult);
          
          // Nếu là success, cần gọi API để update DB
          if (result.status === 'success' && result.orderCode) {
            // Gọi API process payment (sau khi đã có token)
            fetch(`/api/v1/payments/payos/process-return/${result.orderCode}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}`
              },
              body: JSON.stringify({
                code: result.code,
                status: result.paymentStatus,
                paymentLinkId: result.paymentLinkId,
                orderCode: result.orderCode
              })
            }).then(() => {
              console.log('✅ Payment updated after login');
            }).catch(err => {
              console.error('Error updating payment:', err);
            });
          }
        } catch (err) {
          console.error('Error processing payment result:', err);
        }
        
        // Redirect về dashboard để hiển thị toast (chỉ cho cashier/manager)
        if (!isKitchenStaff) {
          navigate("/dashboard?from=payment");
        } else {
          navigate("/kitchen?from=payment");
        }
      } else {
        // Auto-redirect theo role
        if (isKitchenStaff) {
          console.log('🍳 Kitchen staff → redirect to /kitchen');
          navigate("/kitchen");
        } else if (isManager) {
          console.log('👔 Manager → redirect to /manager');
          window.location.href = '/manager';
        } else {
          console.log('💰 Cashier → redirect to /dashboard');
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-cream-50 text-dark-700 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl bg-white ring-1 ring-black/5
                     min-h-[86vh] lg:min-h-[88vh]"
        >
          {/* LEFT – banner */}
          <div className="hidden lg:block">
            <div className="h-full w-full bg-gradient-to-br from-primary-100 via-primary-50 to-cream-100 p-12 lg:p-16 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/70 shadow flex items-center justify-center">
                  <CoffeeIcon className="w-8 h-8 text-primary-700" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-primary-900">
                    Coffee<span className="text-primary-600">POS</span>
                  </h1>
                  <p className="text-sm text-dark-600 mt-1">Hệ thống quản lý quán cà phê</p>
                </div>
              </div>

              <div className="mt-10">
                <p className="text-2xl font-semibold text-primary-900">
                  Quản lý dễ dàng • Vận hành mượt mà
                </p>
                <p className="mt-3 max-w-md text-dark-600">
                  Đồng bộ order, bếp/pha chế, thanh toán và báo cáo doanh thu theo ca.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT – login */}
          <div className="p-8 lg:p-12">
            {/* header */}
            <div className="rounded-2xl overflow-hidden ring-1 ring-gray-100 mb-6">
              <div className="bg-gradient-to-r from-primary-200 via-primary-100 to-cream-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center">
                    <CoffeeIcon className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-600 uppercase">
                      Đăng nhập hệ thống để quản lý dễ dàng hơn
                    </p>
                    <h2 className="text-base font-bold text-primary-900">QUẢN LÝ QUÁN CÀ PHÊ</h2>
                  </div>
                </div>
              </div>
            </div>

            {/* role tiles */}
            <div className="grid grid-cols-2 gap-4 mb-4" role="radiogroup" aria-label="Chọn vai trò">
              {ROLES.map((r) => {
                const active = r.key === selectedRole;
                const colors = ROLE_COLORS[r.key];
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    aria-pressed={active}
                    className={[
                      "group h-24 rounded-2xl border transition-all duration-200 text-left p-4 focus:outline-none focus:ring-2",
                      colors.focusRing,
                      active
                        ? `${colors.border} ring-2 ${colors.ring}/30 ${colors.bg}`
                        : `border-gray-200 ${colors.hoverBorder} hover:shadow-lg hover:-translate-y-0.5 bg-white`,
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        active 
                          ? `${colors.iconBg} ${colors.iconText}` 
                          : `bg-cream-200 text-gray-600 ${colors.hoverBg} ${colors.hoverText}`,
                      ].join(" ")}
                    >
                      <r.icon className="w-5 h-5" />
                    </div>
                    <div
                      className={[
                        "mt-2 text-sm font-medium transition-colors",
                        active ? colors.text : `text-gray-700 ${colors.hoverText}`,
                      ].join(" ")}
                    >
                      {r.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* form */}
            {!selectedRole ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-accent-700 bg-accent-50 rounded-xl py-2">
                  Vui lòng chọn <b>vai trò</b> để tiếp tục.
                </p>
              </div>
            ) : (
              <>
                <p className="text-center text-xs text-dark-500">
                  Vai trò đã chọn: <b>{ROLES.find(r=>r.key===selectedRole)?.label}</b>
                </p>

                <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="username" className="sr-only">Tên đăng nhập</label>
                    <input
                      id="username"
                      className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-primary-500 bg-white transition-shadow"
                      placeholder="Tên đăng nhập"
                      value={form.username}
                      onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))}
                      autoComplete="username"
                    />
                  </div>

                  <div className="relative">
                    <label htmlFor="password" className="sr-only">Mật khẩu</label>
                    <input
                      id="password"
                      type={showPw ? "text" : "password"}
                      className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-primary-500 bg-white pr-12 transition-shadow"
                      placeholder="Mật khẩu"
                      value={form.password}
                      onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                      autoComplete="current-password"
                    />
                     <button
                       type="button"
                       onClick={() => setShowPw(s => !s)}
                       className="absolute inset-y-0 right-0 px-3 bg-transparent border-none text-primary-600 hover:text-primary-700 transition-colors flex items-center justify-center focus:outline-none"
                       aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                     >
                       {showPw ? (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                         </svg>
                       ) : (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                         </svg>
                       )}
                     </button>
                  </div>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 rounded-xl p-2">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !form.username || !form.password}
                    className="w-full rounded-xl border-2 border-primary-600 bg-primary-600 text-white font-semibold py-2.5 transition-all duration-200 flex items-center justify-center gap-2 hover:bg-white hover:text-primary-600 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary-600 disabled:hover:text-white disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    {loading && (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                    )}
                    {loading ? "Đang đăng nhập…" : "Đăng nhập"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
