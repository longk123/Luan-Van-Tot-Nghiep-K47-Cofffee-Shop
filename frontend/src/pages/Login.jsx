import { useState } from "react";
import { saveToken } from "../auth";
import { useNavigate } from "react-router-dom";

const ROLES = [
  { key: "cashier", label: "Thu ngân", icon: "💳" },
  { key: "kitchen", label: "Pha chế / Bếp", icon: "👨‍🍳" },
  { key: "manager", label: "Quản lý", icon: "📊" },
  { key: "admin",   label: "Quản trị viên", icon: "🛡️" },
];

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
        
        // Redirect về dashboard để hiển thị toast
        navigate("/dashboard?from=payment");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#faf7f2] text-gray-800 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl bg-white ring-1 ring-black/5
                     min-h-[86vh] lg:min-h-[88vh]"
        >
          {/* LEFT – banner */}
          <div className="hidden lg:block">
            <div className="h-full w-full bg-gradient-to-br from-[#f6e6d8] via-[#fbead1] to-[#fdecc8] p-12 lg:p-16 flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-white/70 shadow flex items-center justify-center text-xl font-bold">
                  ☕
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-[#3f392f]">
                    Coffee<span className="text-[#c9975b]">POS</span>
                  </h1>
                  <p className="text-sm text-[#6e6458] mt-1">Hệ thống quản lý quán cà phê</p>
                </div>
              </div>

              <div className="mt-10">
                <p className="text-2xl font-semibold text-[#3f392f]">
                  Quản lý dễ dàng • Vận hành mượt mà
                </p>
                <p className="mt-3 max-w-md text-[#6e6458]">
                  Đồng bộ order, bếp/pha chế, thanh toán và báo cáo doanh thu theo ca.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT – login */}
          <div className="p-8 lg:p-12">
            {/* header */}
            <div className="rounded-2xl overflow-hidden ring-1 ring-gray-100 mb-6">
              <div className="bg-gradient-to-r from-[#e7d5c2] via-[#f6e6d8] to-[#fdecc8] px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/80 flex items-center justify-center">☕</div>
                  <div>
                    <p className="text-xs text-[#6e6458] uppercase">
                      Đăng nhập hệ thống để quản lý dễ dàng hơn
                    </p>
                    <h2 className="text-base font-bold text-[#3f392f]">QUẢN LÝ QUÁN CÀ PHÊ</h2>
                  </div>
                </div>
              </div>
            </div>

            {/* role tiles */}
            <div className="grid grid-cols-2 gap-4 mb-4" role="radiogroup" aria-label="Chọn vai trò">
              {ROLES.map((r) => {
                const active = r.key === selectedRole;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    aria-pressed={active}
                    className={[
                      "group h-24 rounded-2xl border transition text-left p-4 focus:outline-none focus:ring-2 focus:ring-[#c9975b]",
                      active
                        ? "border-[#c9975b] ring-2 ring-[#c9975b]/30 bg-[#fffaf3]"
                        : "border-gray-200 hover:border-[#c9975b] hover:shadow bg-white",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                        active ? "bg-[#f2e3cf]" : "bg-[#faf5ef] group-hover:bg-[#f2e3cf]",
                      ].join(" ")}
                    >
                      {r.icon}
                    </div>
                    <div
                      className={[
                        "mt-2 text-sm font-medium",
                        active ? "text-[#7a5e3a]" : "text-gray-700 group-hover:text-[#7a5e3a]",
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
                <p className="text-center text-sm text-amber-700 bg-amber-50 rounded-xl py-2">
                  Vui lòng chọn <b>vai trò</b> để tiếp tục.
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <p className="font-medium mb-1">🔑 Thông tin đăng nhập mẫu:</p>
                  <p>• <strong>Admin:</strong> admin / admin123 (tất cả quyền)</p>
                  <p>• <strong>Thu ngân:</strong> cashier / cashier123</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-center text-xs text-gray-500">
                  Vai trò đã chọn: <b>{ROLES.find(r=>r.key===selectedRole)?.label}</b>
                </p>

                <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                  <div>
                    <label htmlFor="username" className="sr-only">Tên đăng nhập</label>
                    <input
                      id="username"
                      className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-[#c9975b] bg-white"
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
                      className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-[#c9975b] bg-white pr-12"
                      placeholder="Mật khẩu"
                      value={form.password}
                      onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                      autoComplete="current-password"
                    />
                     <button
                       type="button"
                       onClick={() => setShowPw(s => !s)}
                       className="absolute inset-y-0 right-0 px-3 bg-transparent border-none text-[#c9975b] hover:text-[#b88749] transition-colors flex items-center justify-center focus:outline-none"
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
                    className="w-full rounded-xl bg-[#c9975b] hover:bg-[#b88749] disabled:opacity-60 text-white font-semibold py-2.5 transition flex items-center justify-center gap-2"
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
